# -*- coding: utf-8 -*-

from odoo.exceptions import UserError
from odoo.tests import tagged
from odoo.tests.common import TransactionCase


@tagged("post_install", "-at_install", "yms_inventory")
class TestYmsInventoryWorkflow(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.product = cls.env.ref("yms_inventory.product_yms_pipe_24")
        cls.pending = cls.env.ref("yms_inventory.stock_location_yms_pending")
        cls.yard = cls.env.ref("yms_inventory.stock_location_yms_yard_01")
        cls.bin = cls.env.ref("yms_inventory.stock_location_yms_bin_b01")
        cls.plate_p01 = cls.env.ref("yms_inventory.stock_location_yms_plate_p01")
        cls.plate_p02 = cls.env.ref("yms_inventory.stock_location_yms_plate_p02")
        cls.Picking = cls.env["stock.picking"]
        cls.Lot = cls.env["stock.lot"]
        cls.Quant = cls.env["stock.quant"]

    def _qty_at(self, lot, location):
        return sum(
            self.Quant.search(
                [("lot_id", "=", lot.id), ("location_id", "=", location.id)]
            ).mapped("quantity")
        )

    def _receive(self, name):
        return self.Picking.yms_receive_pipes_to_pending(self.product, [name], origin="TEST")

    def test_01_full_happy_path(self):
        name = "PIPE-001-CASE"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        self.assertTrue(lot)
        self.assertGreater(self._qty_at(lot, self.pending), 0)
        self.assertEqual(lot.yms_quality_status, "pending")

        lot.yms_save_quality_check("passed", remarks=False)
        self.assertTrue(lot.yms_putaway_eligible)
        self.assertEqual(self._qty_at(lot, self.pending), 1)

        self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)
        self.assertEqual(self._qty_at(lot, self.pending), 0)
        self.assertEqual(self._qty_at(lot, self.plate_p01), 1)

        inv = self.Lot.yms_get_inventory_pipes()
        located = [r for r in inv["rows"] if r["pipe_id"] == name]
        self.assertEqual(located[0]["status"], "Located")
        self.assertEqual(located[0]["plate"], "Plate-P01")

        self.Picking.yms_move_pipe_ui(lot.id, self.yard.id, self.bin.id, self.plate_p02.id, 1, self.plate_p01.id)
        self.assertEqual(self._qty_at(lot, self.plate_p01), 0)
        self.assertEqual(self._qty_at(lot, self.plate_p02), 1)

        res = self.Lot.yms_save_verification_ui(lot.id, 1)
        self.assertEqual(res["status"], "matched")
        self.assertEqual(self._qty_at(lot, self.plate_p02), 1)

        avail = self.env["product.product"].yms_get_material_availability(self.product.id, 1)
        self.assertGreaterEqual(avail["available_qty"], 1)
        self.assertTrue(any(p["pipe_id"] == name for p in avail["pipes"]))

        pick = self.env["yms.stock.pick"].yms_create_pick_ui(self.product.id, 1, lot.id, origin="MO-TEST", complete=True)
        self.assertEqual(pick["state"], "done")
        self.assertEqual(self._qty_at(lot, self.plate_p02), 0)
        pick_rec = self.env["yms.stock.pick"].browse(pick["id"])
        dest = pick_rec.dest_location_id
        self.assertTrue(dest.usage == "internal")
        self.assertNotEqual(dest.yms_location_type, "plate")

        history = self.Picking.yms_get_traceability(lot_id=lot.id)
        self.assertTrue(history)
        types = {row["type"] for row in history}
        self.assertTrue(any("Pending" in (row.get("to_location") or "") for row in history))
        self.assertIn("Put-away", types)
        self.assertTrue({"Bin Transfer", "Yard Transfer"} & types or any("Transfer" in t for t in types))
        self.assertTrue(any("Retriev" in (t or "") or "Pick" in (t or "") for t in types))
        reports = self.Lot.yms_get_inventory_reports()
        self.assertIn("inventory_summary", reports)
        self.assertIn("provisional", reports)
        live = self.Lot.yms_get_inventory_pipes()
        self.assertEqual(reports["inventory_summary"].get("total"), live["kpi"].get("total"))

    def test_02_quality_failed_blocks_putaway(self):
        name = "PIPE-FAIL-TEST"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("failed", remarks="crack")
        with self.assertRaises(UserError):
            self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)
        self.assertGreater(self._qty_at(lot, self.pending), 0)

    def test_03_quality_hold_blocks_putaway(self):
        name = "PIPE-HOLD-TEST"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("hold", remarks="wait")
        with self.assertRaises(UserError):
            self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)

    def test_04_duplicate_pipe_id(self):
        name = "PIPE-DUP-TEST"
        self._receive(name)
        with self.assertRaises(UserError):
            self._receive(name)

    def test_05_invalid_hierarchy(self):
        name = "PIPE-HIER-TEST"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("passed")
        with self.assertRaises(UserError):
            self.Picking.yms_putaway_lot_to_plate(lot, self.bin, self.yard, self.plate_p01)

    def test_06_verification_shortage_and_excess_do_not_change_stock(self):
        name = "PIPE-VER-TEST"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("passed")
        self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)
        before = self._qty_at(lot, self.plate_p01)
        short = self.Lot.yms_save_verification_ui(lot.id, 0)
        self.assertEqual(short["status"], "shortage")
        self.assertEqual(short["variance"], -1)
        self.assertEqual(self._qty_at(lot, self.plate_p01), before)
        excess = self.Lot.yms_save_verification_ui(lot.id, 2)
        self.assertEqual(excess["status"], "excess")
        self.assertEqual(excess["variance"], 1)
        self.assertEqual(self._qty_at(lot, self.plate_p01), before)

    def test_07_move_same_location_rejected(self):
        name = "PIPE-SAME-TEST"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("passed")
        self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)
        with self.assertRaises(UserError):
            self.Picking.yms_move_pipe_ui(lot.id, self.yard.id, self.bin.id, self.plate_p01.id, 1, self.plate_p01.id)

    def test_08_empty_pipe_id(self):
        with self.assertRaises(UserError):
            self._receive("   ")

    def test_09_negative_verification(self):
        name = "PIPE-VER-NEG"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("passed")
        self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)
        with self.assertRaises(UserError):
            self.Lot.yms_save_verification_ui(lot.id, -1)
        self.assertEqual(self._qty_at(lot, self.plate_p01), 1)

    def test_10_insufficient_pick_quantity(self):
        name = "PIPE-PICK-QTY"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("passed")
        self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)
        with self.assertRaises(UserError):
            self.env["yms.stock.pick"].yms_create_pick(self.product.id, 2, lot.id)

    def test_11_cannot_receive_serial_still_in_warehouse(self):
        name = "PIPE-STILL-IN-WH"
        self._receive(name)
        lot = self.Lot.search([("name", "=", name), ("product_id", "=", self.product.id)], limit=1)
        lot.yms_save_quality_check("passed")
        self.Picking.yms_putaway_lot_to_plate(lot, self.yard, self.bin, self.plate_p01)
        self.env["yms.stock.pick"].yms_create_pick_ui(self.product.id, 1, lot.id, origin="MO-STILL", complete=True)
        with self.assertRaises(UserError):
            self._receive(name)
