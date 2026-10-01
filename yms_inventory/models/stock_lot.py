# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError

YMS_QUALITY_STATUSES = [
    ("pending", "Pending"),
    ("passed", "Passed"),
    ("failed", "Failed"),
    ("hold", "Hold"),
]


class StockLot(models.Model):
    _inherit = "stock.lot"

    yms_barcode = fields.Char(
        string="Barcode",
        copy=False,
        index=True,
        help="Optional scan barcode. Pipe ID remains the lot/serial name.",
    )
    yms_quality_status = fields.Selection(
        selection=YMS_QUALITY_STATUSES,
        string="YMS Quality Status",
        default="pending",
        required=True,
        index=True,
        copy=False,
    )
    yms_quality_date = fields.Datetime(string="Quality Inspection Date", copy=False)
    yms_quality_remarks = fields.Text(string="Quality Remarks", copy=False)
    yms_quality_user_id = fields.Many2one("res.users", string="Quality Checked By", copy=False)
    yms_putaway_eligible = fields.Boolean(
        string="Eligible for Put-away",
        default=False,
        copy=False,
        help="Set when quality is Passed. Stock stays in WH/Pending until put-away.",
    )
    yms_verify_physical_qty = fields.Float(
        string="Physical Quantity",
        digits="Product Unit of Measure",
        copy=False,
        help="Last counted physical quantity. Does not change stock.quant.",
    )
    yms_verify_variance = fields.Float(
        string="Verification Variance",
        digits="Product Unit of Measure",
        copy=False,
    )
    yms_verify_status = fields.Selection(
        [
            ("matched", "Matched"),
            ("shortage", "Shortage"),
            ("excess", "Excess"),
        ],
        string="Verification Status",
        copy=False,
        index=True,
    )
    yms_verify_date = fields.Datetime(string="Verification Date", copy=False)
    yms_verify_user_id = fields.Many2one("res.users", string="Verified By", copy=False)
    yms_verify_remarks = fields.Text(string="Verification Remarks", copy=False)

    def _yms_pending_qty(self):
        self.ensure_one()
        pending = self.env["stock.location"]._get_yms_pending_location()
        if not pending:
            return 0.0
        quants = self.quant_ids.filtered(
            lambda q: q.location_id == pending and q.quantity > 0
        )
        return sum(quants.mapped("quantity"))

    @api.model
    def yms_get_pending_quality_pipes(self):
        """Pipes currently in WH/Pending, with quantity from stock.quant."""
        pending = self.env["stock.location"]._get_yms_pending_location()
        if not pending:
            return []
        quants = self.env["stock.quant"].search(
            [
                ("location_id", "=", pending.id),
                ("quantity", ">", 0),
                ("lot_id", "!=", False),
            ]
        )
        labels = dict(YMS_QUALITY_STATUSES)
        result_map = {"pending": "Pending", "passed": "Pass", "failed": "Fail", "hold": "Hold"}
        rows = []
        for quant in quants:
            lot = quant.lot_id
            status = lot.yms_quality_status or "pending"
            rows.append(
                {
                    "lot_id": lot.id,
                    "pipe_id": lot.name,
                    "barcode": lot.yms_barcode or lot.name,
                    "product": lot.product_id.display_name,
                    "spec": lot.product_id.default_code or "—",
                    "qty": quant.quantity,
                    "status": status,
                    "status_label": labels.get(status, status),
                    "result": result_map.get(status, status),
                    "date": fields.Datetime.to_string(lot.yms_quality_date) if lot.yms_quality_date else False,
                    "remarks": lot.yms_quality_remarks or "",
                    "checked_by": lot.yms_quality_user_id.name or "",
                    "putaway_eligible": bool(lot.yms_putaway_eligible),
                }
            )
        return rows

    @api.model
    def yms_ensure_pipes_in_pending(self, pipe_names=None):
        """After Receive to Pending, make those Pipe IDs visible on Quality Check."""
        names = [str(name).strip() for name in (pipe_names or []) if str(name).strip()]
        if names:
            lots = self.search([("name", "in", names)])
            self.env["stock.picking"]._yms_move_lot_qty_to_pending(lots)
        return self.yms_get_pending_quality_pipes()

    def yms_save_quality_check(self, status, remarks=False, inspection_date=False):
        self.ensure_one()
        status = (status or "").strip().lower()
        allowed = {item[0] for item in YMS_QUALITY_STATUSES}
        if status not in allowed:
            raise UserError(_("Invalid quality status."))
        if status == "pending":
            raise UserError(_("Select Passed, Failed, or Hold."))
        if not self.exists():
            raise UserError(_("Pipe not found."))
        if self.yms_quality_status != "pending":
            raise UserError(_("This pipe has already been quality checked."))
        pending_qty = self._yms_pending_qty()
        if pending_qty <= 0:
            raise UserError(_("Pipe is not in WH/Pending."))
        if status in ("failed", "hold") and not (remarks or "").strip():
            raise UserError(_("Remarks are required for Failed or Hold."))
        self.write(
            {
                "yms_quality_status": status,
                "yms_quality_date": inspection_date or fields.Datetime.now(),
                "yms_quality_remarks": (remarks or "").strip() or False,
                "yms_quality_user_id": self.env.uid,
                "yms_putaway_eligible": status == "passed",
            }
        )
        return True

    @api.model
    def yms_save_quality_check_ui(self, lot_id, status, remarks=False):
        lot = self.browse(lot_id)
        if not lot.exists():
            raise UserError(_("Pipe not found."))
        lot.yms_save_quality_check(status, remarks=remarks)
        return self.yms_get_pending_quality_pipes()

    def _yms_location_parts(self, location):
        """Yard / Bin / Plate names from stock.location parent chain."""
        if not location:
            return ("", "", "")
        if location.yms_location_type == "pending":
            return ("WH / Pending", "Provisional", "")
        if location.yms_location_type == "plate":
            bin_loc = location.location_id
            yard = bin_loc.location_id if bin_loc and bin_loc.yms_location_type == "bin" else bin_loc
            return (yard.name or "", bin_loc.name or "", location.name or "")
        if location.yms_location_type == "bin":
            yard = location.location_id
            return (yard.name or "", location.name or "", "")
        if location.yms_location_type == "yard":
            return (location.name or "", "", "")
        return ("", "", location.name or "")

    def _yms_last_move_info(self, lot):
        line = self.env["stock.move.line"].search(
            [("lot_id", "=", lot.id), ("state", "=", "done"), ("quantity", ">", 0)],
            order="date desc, id desc",
            limit=1,
        )
        if not line:
            return {
                "last": "",
                "last_from": "",
                "last_to": "",
                "last_type": "",
                "last_user": "",
            }
        picking = line.picking_id
        move_type = ""
        if picking and picking.picking_type_id:
            move_type = picking.picking_type_id.name or ""
        elif line.move_id and line.move_id.picking_type_id:
            move_type = line.move_id.picking_type_id.name or ""
        user = ""
        if picking and picking.user_id:
            user = picking.user_id.name or ""
        elif line.create_uid:
            user = line.create_uid.name or ""
        return {
            "last": fields.Datetime.to_string(line.date) if line.date else "",
            "last_from": line.location_id.complete_name or "",
            "last_to": line.location_dest_id.complete_name or "",
            "last_type": move_type,
            "last_user": user,
        }

    def _yms_inventory_row(self, quant):
        lot = quant.lot_id
        location = quant.location_id
        loc_type = location.yms_location_type
        yard_name, bin_name, plate_name = self._yms_location_parts(location)
        reserved = quant.reserved_quantity or 0.0
        qty = quant.quantity or 0.0
        available = max(qty - reserved, 0.0)
        if loc_type == "pending":
            inv_status = "Provisional"
            loc_source = "—"
        elif reserved > 0:
            inv_status = "Reserved"
            loc_source = "Inventory Put-away"
        else:
            inv_status = "Located"
            loc_source = "Inventory Put-away"
        qstatus = lot.yms_quality_status or "pending"
        quality_ui = {
            "passed": "Accepted",
            "failed": "Rejected",
            "hold": "Hold",
            "pending": "Pending",
        }
        move = self._yms_last_move_info(lot)
        return {
            "quant_id": quant.id,
            "lot_id": lot.id,
            "id": lot.name,
            "pipe_id": lot.name,
            "barcode": lot.yms_barcode or lot.name,
            "material": lot.product_id.display_name,
            "product_id": lot.product_id.id,
            "spec": lot.product_id.default_code or "—",
            "batch": lot.ref or "—",
            "qty": qty,
            "reserved": reserved,
            "available": available,
            "quality": quality_ui.get(qstatus, qstatus),
            "quality_status": qstatus,
            "status": inv_status,
            "yard": yard_name or "—",
            "bin": bin_name or "—",
            "plate": plate_name or "—",
            "location": location.complete_name or "",
            "loc_type": loc_type or "",
            "locSource": loc_source,
            "last": move["last"],
            "lastFrom": move["last_from"],
            "lastTo": move["last_to"],
            "lastType": move["last_type"],
            "lastUser": move["last_user"],
        }

    def _yms_inventory_quants(self):
        Location = self.env["stock.location"]
        pending = Location._get_yms_pending_location()
        plates = Location.search([("yms_location_type", "=", "plate"), ("usage", "=", "internal")])
        loc_ids = list(plates.ids)
        if pending:
            loc_ids.append(pending.id)
        if not loc_ids:
            return self.env["stock.quant"]
        return self.env["stock.quant"].search(
            [
                ("location_id", "in", loc_ids),
                ("quantity", ">", 0),
                ("lot_id", "!=", False),
            ]
        )

    @api.model
    def yms_get_putaway_pipes(self):
        """Pending + already located YMS pipes from stock.quant."""
        pending = self.env["stock.location"]._get_yms_pending_location()
        labels = dict(YMS_QUALITY_STATUSES)
        rows = []
        if pending:
            for quant in self.env["stock.quant"].search(
                [("location_id", "=", pending.id), ("quantity", ">", 0), ("lot_id", "!=", False)]
            ):
                lot = quant.lot_id
                status = lot.yms_quality_status or "pending"
                rows.append(
                    {
                        "lot_id": lot.id,
                        "pipe_id": lot.name,
                        "product": lot.product_id.display_name,
                        "qty": quant.quantity,
                        "quality": labels.get(status, status),
                        "status": status,
                        "eligible": bool(lot.yms_putaway_eligible and status == "passed"),
                        "prevLoc": "Provisional / Pending",
                        "yard": "",
                        "bin": "",
                        "plate": "",
                        "locSource": "—",
                        "loc": "Pending",
                    }
                )
        plates = self.env["stock.location"].search(
            [("yms_location_type", "=", "plate"), ("usage", "=", "internal")]
        )
        if plates:
            for quant in self.env["stock.quant"].search(
                [("location_id", "in", plates.ids), ("quantity", ">", 0), ("lot_id", "!=", False)]
            ):
                lot = quant.lot_id
                status = lot.yms_quality_status or "pending"
                yard_name, bin_name, plate_name = lot._yms_location_parts(quant.location_id)
                rows.append(
                    {
                        "lot_id": lot.id,
                        "pipe_id": lot.name,
                        "product": lot.product_id.display_name,
                        "qty": quant.quantity,
                        "quality": labels.get(status, status),
                        "status": status,
                        "eligible": False,
                        "prevLoc": "Provisional / Pending",
                        "yard": yard_name,
                        "bin": bin_name,
                        "plate": plate_name,
                        "locSource": "Inventory Put-away",
                        "loc": "Located",
                    }
                )
        return rows

    @api.model
    def yms_putaway_ui(self, lot_id, yard_id, bin_id, plate_id):
        lot = self.browse(lot_id)
        if not lot.exists():
            raise UserError(_("Pipe not found."))
        picking = self.env["stock.picking"].yms_putaway_lot_to_plate(lot, yard_id, bin_id, plate_id)
        return {
            "picking_id": picking.id,
            "picking_name": picking.name,
            "pipes": self.yms_get_putaway_pipes(),
        }

    @api.model
    def yms_get_inventory_pipes(
        self, query=None, status=None, yard=None, bin_name=None, plate_name=None, product_id=None
    ):
        """Read-only Inventory & Location rows from stock.quant (YMS Pending + Plates)."""
        rows = [self._yms_inventory_row(quant) for quant in self._yms_inventory_quants()]
        kpi = {
            "total": sum(r["qty"] for r in rows),
            "provisional": sum(r["qty"] for r in rows if r["status"] == "Provisional"),
            "located": sum(r["qty"] for r in rows if r["loc_type"] == "plate"),
            "available": sum(r["available"] for r in rows if r["loc_type"] == "plate"),
            "reservedPicked": sum(r["reserved"] for r in rows),
        }
        q = (query or "").strip().lower()
        status = status or "all"
        yard = yard or "all"
        bin_name = bin_name or "all"
        plate_name = plate_name or "all"
        product_id = int(product_id or 0)

        def _match(row):
            if status and status != "all":
                if status == "Available":
                    if row["status"] != "Located" or row["reserved"]:
                        return False
                elif status == "Picked":
                    return False
                elif row["status"] != status:
                    return False
            if yard and yard != "all" and row["yard"] != yard:
                return False
            if bin_name and bin_name != "all" and row["bin"] != bin_name:
                return False
            if plate_name and plate_name != "all" and row["plate"] != plate_name:
                return False
            if product_id and row["product_id"] != product_id:
                return False
            if q:
                hay = (
                    f"{row['id']} {row['barcode']} {row['material']} {row['spec']} "
                    f"{row['yard']} {row['bin']} {row['plate']}"
                ).lower()
                if q not in hay:
                    return False
            return True

        filtered = [row for row in rows if _match(row)]
        products = {}
        yards = set()
        bins = set()
        plates = set()
        for row in rows:
            products[row["product_id"]] = row["material"]
            if row["yard"] and row["yard"] != "—":
                yards.add(row["yard"])
            if row["bin"] and row["bin"] != "—":
                bins.add(row["bin"])
            if row["plate"] and row["plate"] != "—":
                plates.add(row["plate"])
        return {
            "rows": filtered,
            "kpi": kpi,
            "products": [{"id": pid, "name": name} for pid, name in sorted(products.items(), key=lambda i: i[1])],
            "yards": sorted(yards),
            "bins": sorted(bins),
            "plates": sorted(plates),
        }

    @api.model
    def yms_get_movement_pipes(self):
        """Pipes with stock on YMS Pending or Plate locations."""
        rows = []
        for quant in self._yms_inventory_quants():
            row = self._yms_inventory_row(quant)
            row["location_id"] = quant.location_id.id
            rows.append(row)
        return rows

    @api.model
    def yms_get_yard_board(self):
        """Live yard occupancy from stock.quant: empty plates vs pipes on plates."""
        Location = self.env["stock.location"]
        plates = Location.search(
            [("yms_location_type", "=", "plate"), ("usage", "=", "internal")],
            order="complete_name",
        )
        by_loc = {}
        for quant in self._yms_inventory_quants().filtered(lambda q: q.location_id.yms_location_type == "plate"):
            by_loc.setdefault(quant.location_id.id, []).append(
                {"pipe": quant.lot_id.name, "qty": quant.quantity}
            )
        rows = []
        occupied = 0
        empty = 0
        for plate in plates:
            yard, bin_name, plate_name = self._yms_location_parts(plate)
            pipes = by_loc.get(plate.id, [])
            if pipes:
                occupied += 1
                status = "Occupied"
            else:
                empty += 1
                status = "Empty"
            rows.append(
                {
                    "id": plate.id,
                    "yard": yard or "—",
                    "bin": bin_name or "—",
                    "plate": plate_name or plate.name,
                    "pipes": ", ".join(p["pipe"] for p in pipes) or "—",
                    "qty": sum(p["qty"] for p in pipes),
                    "status": status,
                }
            )
        return {
            "rows": rows,
            "occupied": occupied,
            "empty": empty,
            "total": len(rows),
        }

    @api.model
    def yms_get_movement_screen(self):
        loc = self.env["stock.location"].yms_get_putaway_locations()
        moves = self.env["stock.picking"].yms_get_pipe_movements()
        return {
            "pipes": self.yms_get_movement_pipes(),
            "yards": loc.get("yards") or [],
            "bins": loc.get("bins") or [],
            "plates": loc.get("plates") or [],
            "movements": moves.get("rows") or [],
            "kpi": moves.get("kpi") or {},
            "yard_board": self.yms_get_yard_board(),
        }

    def _yms_verify_status_from_qty(self, physical_qty, system_qty):
        variance = float(physical_qty) - float(system_qty)
        if variance == 0:
            status = "matched"
        elif variance < 0:
            status = "shortage"
        else:
            status = "excess"
        return variance, status

    def _yms_verification_row(self, quant):
        row = self._yms_inventory_row(quant)
        lot = quant.lot_id
        row["location_id"] = quant.location_id.id
        row["checked"] = bool(lot.yms_verify_status)
        row["verify_status"] = lot.yms_verify_status or ""
        row["verify_label"] = dict(lot._fields["yms_verify_status"].selection).get(lot.yms_verify_status) or "In Stock"
        row["physical_qty"] = lot.yms_verify_physical_qty if lot.yms_verify_status else quant.quantity
        row["variance"] = lot.yms_verify_variance if lot.yms_verify_status else 0.0
        row["verify_remarks"] = lot.yms_verify_remarks or ""
        row["verify_date"] = fields.Datetime.to_string(lot.yms_verify_date) if lot.yms_verify_date else ""
        row["verified_by"] = lot.yms_verify_user_id.name or ""
        return row

    @api.model
    def yms_get_verification_screen(self, loc_id=None, yard=None, bin_name=None, plate_name=None, product_id=None):
        """Load YMS stock for verification. System qty is stock.quant.quantity."""
        all_rows = [self._yms_verification_row(quant) for quant in self._yms_inventory_quants()]
        loc_id = int(loc_id or 0)
        yard = yard or "all"
        bin_name = bin_name or "all"
        plate_name = plate_name or "all"
        product_id = int(product_id or 0)
        rows = []
        for row in all_rows:
            if loc_id and row["location_id"] != loc_id:
                continue
            if yard and yard != "all" and row["yard"] != yard:
                continue
            if bin_name and bin_name != "all" and row["bin"] != bin_name:
                continue
            if plate_name and plate_name != "all" and row["plate"] != plate_name:
                continue
            if product_id and row["product_id"] != product_id:
                continue
            rows.append(row)

        tree_map = {}
        for row in all_rows:
            loc_key = row["location_id"]
            if loc_key not in tree_map:
                tree_map[loc_key] = {
                    "id": loc_key,
                    "name": row["plate"] if row["loc_type"] == "plate" else (row["yard"] or "Pending"),
                    "yard": row["yard"],
                    "bin": row["bin"],
                    "plate": row["plate"],
                    "loc_type": row["loc_type"],
                    "qty": 0,
                    "label": row["location"] or row["yard"],
                }
            tree_map[loc_key]["qty"] += row["qty"]
        tree = sorted(tree_map.values(), key=lambda n: (n["yard"] or "", n["bin"] or "", n["plate"] or "", n["name"] or ""))

        products = {}
        yards = set()
        bins = set()
        plates = set()
        for row in all_rows:
            products[row["product_id"]] = row["material"]
            if row["yard"] and row["yard"] != "—":
                yards.add(row["yard"])
            if row["bin"] and row["bin"] != "—":
                bins.add(row["bin"])
            if row["plate"] and row["plate"] != "—":
                plates.add(row["plate"])

        logs = self.env["yms.stock.verification"].search([], limit=200)
        history = [
            {
                "session": rec.name,
                "date": fields.Datetime.to_string(rec.verify_date) if rec.verify_date else "",
                "location": rec.location_id.complete_name or rec.location_id.name,
                "pipe": rec.lot_id.name,
                "verified": 1,
                "discrepancies": 0 if rec.status == "matched" else 1,
                "user": rec.user_id.name or "",
                "status": "Completed",
                "result": dict(rec._fields["status"].selection).get(rec.status),
            }
            for rec in logs
        ]
        discrepancies = [
            {
                "session": rec.name,
                "pipe": rec.lot_id.name,
                "location": rec.location_id.complete_name or rec.location_id.name,
                "system_qty": rec.system_qty,
                "physical_qty": rec.physical_qty,
                "variance": rec.variance,
                "status": dict(rec._fields["status"].selection).get(rec.status),
                "remarks": rec.remarks or "",
                "user": rec.user_id.name or "",
                "date": fields.Datetime.to_string(rec.verify_date) if rec.verify_date else "",
            }
            for rec in logs
            if rec.status in ("shortage", "excess")
        ]
        return {
            "rows": rows,
            "tree": tree,
            "history": history,
            "discrepancies": discrepancies,
            "yards": sorted(yards),
            "bins": sorted(bins),
            "plates": sorted(plates),
            "products": [{"id": pid, "name": name} for pid, name in sorted(products.items(), key=lambda i: i[1])],
        }

    @api.model
    def yms_save_verification_ui(self, lot_id, physical_qty, remarks=False, loc_id=None):
        """Save reconciliation only. Does not write stock.quant.quantity."""
        lot = self.browse(lot_id)
        if not lot.exists():
            raise UserError(_("Pipe not found."))
        yms_quants = lot.quant_ids.filtered(
            lambda q: q.quantity > 0 and q.location_id.yms_location_type in ("pending", "plate")
        )
        if not yms_quants:
            raise UserError(_("Pipe does not have stock to verify."))
        quant = yms_quants[0]
        system_qty = quant.quantity
        try:
            physical = float(physical_qty)
        except (TypeError, ValueError):
            raise UserError(_("Enter a valid physical quantity."))
        if physical < 0:
            raise UserError(_("Physical quantity cannot be negative."))
        variance, status = lot._yms_verify_status_from_qty(physical, system_qty)
        now = fields.Datetime.now()
        lot.write(
            {
                "yms_verify_physical_qty": physical,
                "yms_verify_variance": variance,
                "yms_verify_status": status,
                "yms_verify_date": now,
                "yms_verify_user_id": self.env.uid,
                "yms_verify_remarks": (remarks or "").strip() or False,
            }
        )
        self.env["yms.stock.verification"].create(
            {
                "lot_id": lot.id,
                "location_id": quant.location_id.id,
                "product_id": lot.product_id.id,
                "system_qty": system_qty,
                "physical_qty": physical,
                "variance": variance,
                "status": status,
                "verify_date": now,
                "user_id": self.env.uid,
                "remarks": (remarks or "").strip() or False,
            }
        )
        return {
            "status": status,
            "variance": variance,
            "system_qty": system_qty,
            "physical_qty": physical,
            "screen": self.yms_get_verification_screen(loc_id=loc_id),
        }

    @api.model
    def yms_get_provisional_stock(self):
        """WH/Pending stock.quant rows (provisional inventory)."""
        data = self.yms_get_inventory_pipes()
        rows = [row for row in data.get("rows") or [] if row.get("loc_type") == "pending"]
        return {"rows": rows, "qty": sum(r.get("qty") or 0 for r in rows)}

    @api.model
    def yms_get_located_stock(self):
        """Plate stock.quant rows (located inventory)."""
        data = self.yms_get_inventory_pipes()
        rows = [row for row in data.get("rows") or [] if row.get("loc_type") == "plate"]
        return {"rows": rows, "qty": sum(r.get("qty") or 0 for r in rows)}

    @api.model
    def yms_get_inventory_reports(self):
        """Analytics from live stock.quant, quality, verification, movements, picks."""
        inv = self.yms_get_inventory_pipes()
        rows = inv.get("rows") or []
        by_yard = {}
        by_bin = {}
        by_plate = {}
        quality = {"pending": 0, "passed": 0, "failed": 0, "hold": 0}
        for row in rows:
            qty = row.get("qty") or 0
            yard = row.get("yard") or "—"
            bin_name = row.get("bin") or "—"
            plate = row.get("plate") or "—"
            by_yard[yard] = by_yard.get(yard, 0) + qty
            by_bin[bin_name] = by_bin.get(bin_name, 0) + qty
            by_plate[plate] = by_plate.get(plate, 0) + qty
            qstatus = row.get("quality_status") or "pending"
            if qstatus in quality:
                quality[qstatus] += qty
        verifs = self.env["yms.stock.verification"].search([])
        variance = {
            "count": len(verifs),
            "matched": len(verifs.filtered(lambda v: v.status == "matched")),
            "shortage": len(verifs.filtered(lambda v: v.status == "shortage")),
            "excess": len(verifs.filtered(lambda v: v.status == "excess")),
            "total_variance": sum(verifs.mapped("variance")),
        }
        moves = self.env["stock.picking"].yms_get_pipe_movements()
        picks = self.env["yms.stock.pick"].yms_get_picks()
        pick_states = {}
        for pick in picks:
            pick_states[pick["state"]] = pick_states.get(pick["state"], 0) + 1
        return {
            "inventory_summary": inv.get("kpi") or {},
            "provisional": self.yms_get_provisional_stock(),
            "located": self.yms_get_located_stock(),
            "stock_by_yard": [{"name": k, "qty": v} for k, v in sorted(by_yard.items())],
            "stock_by_bin": [{"name": k, "qty": v} for k, v in sorted(by_bin.items())],
            "stock_by_plate": [{"name": k, "qty": v} for k, v in sorted(by_plate.items())],
            "quality_status": quality,
            "verification": {
                "count": variance["count"],
                "matched": variance["matched"],
                "shortage": variance["shortage"],
                "excess": variance["excess"],
            },
            "variance": variance,
            "pipe_movement": moves.get("kpi") or {},
            "picking": {"total": len(picks), "by_state": pick_states},
            "traceability_count": len(self.env["stock.picking"].yms_get_traceability()),
        }

    @api.model
    def yms_reset_screens(self):
        """Clear imported plans and YMS stock so every Inventory screen is empty."""
        inbound = self.env["yms.inbound.po"].sudo().search([])
        yard = self.env["yms.yard.plan"].sudo().search([])
        picks = self.env["yms.stock.pick"].sudo().search([])
        inbound_n = len(inbound)
        yard_n = len(yard)
        inbound.unlink()
        yard.unlink()
        picks.unlink()
        self.env["yms.stock.verification"].sudo().search([]).unlink()
        open_pickings = self.env["stock.picking"].sudo().search(
            [("origin", "ilike", "YMS"), ("state", "not in", ("done", "cancel"))]
        )
        if open_pickings:
            open_pickings.action_cancel()
        quants = self.sudo()._yms_inventory_quants()
        extra = self.env["stock.quant"].sudo().search(
            [
                ("lot_id.name", "=like", "PIPE-%"),
                ("location_id.usage", "=", "internal"),
                "|",
                ("quantity", "!=", 0),
                ("reserved_quantity", "!=", 0),
            ]
        )
        quants |= extra
        lots = quants.mapped("lot_id")
        Quant = self.env["stock.quant"].sudo()
        for quant in quants:
            qty = quant.quantity
            if qty:
                Quant._update_available_quantity(quant.product_id, quant.location_id, -qty, lot_id=quant.lot_id)
            reserved = quant.reserved_quantity
            if reserved:
                Quant._update_reserved_quantity(quant.product_id, quant.location_id, -reserved, lot_id=quant.lot_id)
        if lots:
            lots.write(
                {
                    "yms_quality_status": "pending",
                    "yms_putaway_eligible": False,
                    "yms_quality_date": False,
                    "yms_quality_remarks": False,
                    "yms_quality_user_id": False,
                    "yms_verify_status": False,
                    "yms_verify_physical_qty": 0.0,
                    "yms_verify_variance": 0.0,
                    "yms_verify_date": False,
                    "yms_verify_user_id": False,
                    "yms_verify_remarks": False,
                }
            )
        return {
            "cleared_inbound": inbound_n,
            "cleared_yard": yard_n,
            "cleared_stock": len(quants),
        }
