# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class YmsStockPick(models.Model):
    """Inventory retrieval task. Stock quantity remains on stock.quant; completion uses stock.picking."""

    _name = "yms.stock.pick"
    _description = "YMS Picking / Retrieval"
    _order = "id desc"

    name = fields.Char(string="Task", copy=False, index=True)
    origin = fields.Char(string="Requirement / Reference")
    product_id = fields.Many2one("product.product", required=True, index=True)
    product_qty = fields.Float(string="Quantity", required=True, default=1.0, digits="Product Unit of Measure")
    lot_id = fields.Many2one("stock.lot", string="Pipe / Serial", index=True)
    location_id = fields.Many2one("stock.location", string="Source Location")
    dest_location_id = fields.Many2one("stock.location", string="Retrieval Destination")
    picking_id = fields.Many2one("stock.picking", string="Stock Picking", copy=False)
    state = fields.Selection(
        [
            ("draft", "Draft"),
            ("reserved", "Reserved"),
            ("done", "Done"),
            ("cancel", "Cancelled"),
        ],
        default="draft",
        required=True,
        index=True,
    )
    user_id = fields.Many2one("res.users", string="Assigned To", default=lambda self: self.env.user)
    company_id = fields.Many2one("res.company", default=lambda self: self.env.company)

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for rec in records:
            if not rec.name:
                rec.name = "PICK-%04d" % rec.id
        return records

    def _yms_source_quant(self):
        self.ensure_one()
        lot = self.lot_id
        if not lot:
            raise UserError(_("Select a pipe."))
        quants = lot.quant_ids.filtered(
            lambda q: q.quantity > 0 and q.location_id.yms_location_type == "plate"
        )
        if not quants:
            raise UserError(_("Pipe is not available on a YMS Plate."))
        return quants[0]

    def _yms_retrieval_dest(self):
        warehouse = self.env["stock.warehouse"].search(
            [("company_id", "=", (self.company_id or self.env.company).id)], limit=1
        )
        if not warehouse:
            raise UserError(_("No warehouse was found for this company."))
        dest = warehouse.wh_output_stock_loc_id or warehouse.lot_stock_id
        if not dest or dest.usage != "internal":
            raise UserError(_("Warehouse output/stock location is not available for retrieval."))
        return dest

    @api.model
    def yms_create_pick(self, product_id, qty, lot_id=None, origin=False):
        product = self.env["product.product"].browse(int(product_id or 0))
        if not product.exists():
            raise UserError(_("Product not found."))
        try:
            qty = float(qty or 0.0)
        except (TypeError, ValueError):
            raise UserError(_("Quantity is invalid."))
        if qty <= 0:
            raise UserError(_("Picking quantity must be greater than zero."))
        lot = self.env["stock.lot"]
        location = self.env["stock.location"]
        if lot_id:
            lot = self.env["stock.lot"].browse(int(lot_id))
            if not lot.exists():
                raise UserError(_("Pipe not found."))
            if lot.product_id != product:
                raise UserError(_("Pipe does not match the required product."))
        else:
            availability = product.yms_get_material_availability(product.id, qty)
            if not availability["pipes"]:
                raise UserError(_("No available pipe was found on a Plate location."))
            lot = self.env["stock.lot"].browse(availability["pipes"][0]["lot_id"])
        quant = lot.quant_ids.filtered(
            lambda q: q.quantity > 0 and q.location_id.yms_location_type == "plate"
        )[:1]
        if not quant:
            raise UserError(_("Pipe is not available on a YMS Plate."))
        location = quant.location_id
        avail = self.env["stock.quant"]._get_available_quantity(
            product, location, lot_id=lot, strict=True
        )
        if avail < qty:
            raise UserError(_("Insufficient stock for picking."))
        return self.create(
            {
                "product_id": product.id,
                "product_qty": qty,
                "lot_id": lot.id,
                "location_id": location.id,
                "origin": origin or False,
                "state": "draft",
            }
        )

    def yms_reserve(self):
        for rec in self:
            if rec.state not in ("draft", "reserved"):
                raise UserError(_("Only draft or reserved tasks can be reserved."))
            if rec.state == "reserved" and rec.picking_id:
                continue
            quant = rec._yms_source_quant()
            dest = rec._yms_retrieval_dest()
            picking = self.env["stock.picking"]._yms_internal_lot_prepare(
                rec.lot_id,
                quant.location_id,
                dest,
                rec.product_qty,
                origin=_("YMS Pick %s") % rec.name,
                require_plate_dest=False,
            )
            rec.write(
                {
                    "picking_id": picking.id,
                    "location_id": quant.location_id.id,
                    "dest_location_id": dest.id,
                    "state": "reserved",
                }
            )
        return True

    def yms_complete(self):
        for rec in self:
            if rec.state == "done":
                continue
            if rec.state == "cancel":
                raise UserError(_("Cancelled picking cannot be completed."))
            if rec.state != "reserved":
                rec.yms_reserve()
            picking = rec.picking_id
            if picking.state != "done":
                picking.with_context(skip_backorder=True).button_validate()
            if picking.state != "done":
                raise UserError(_("Retrieval could not be validated."))
            rec.state = "done"
        return True

    def yms_cancel(self):
        for rec in self:
            if rec.state == "done":
                raise UserError(_("Completed picking cannot be cancelled."))
            if rec.picking_id and rec.picking_id.state not in ("done", "cancel"):
                rec.picking_id.action_cancel()
            rec.state = "cancel"
        return True

    @api.model
    def yms_get_picks(self):
        rows = []
        for rec in self.search([], limit=200):
            yard, bin_name, plate = self.env["stock.lot"]._yms_location_parts(rec.location_id)
            rows.append(
                {
                    "id": rec.id,
                    "name": rec.name,
                    "origin": rec.origin or "",
                    "product": rec.product_id.display_name,
                    "qty": rec.product_qty,
                    "pipe_id": rec.lot_id.name or "",
                    "lot_id": rec.lot_id.id or False,
                    "yard": yard,
                    "bin": bin_name,
                    "plate": plate,
                    "location": rec.location_id.complete_name if rec.location_id else "",
                    "dest": rec.dest_location_id.complete_name if rec.dest_location_id else "",
                    "state": rec.state,
                    "picking": rec.picking_id.name or "",
                    "user": rec.user_id.name or "",
                }
            )
        return rows

    @api.model
    def yms_create_pick_ui(self, product_id, qty, lot_id=None, origin=False, complete=False):
        rec = self.yms_create_pick(product_id, qty, lot_id=lot_id, origin=origin)
        rec.yms_reserve()
        if complete:
            rec.yms_complete()
        return {
            "id": rec.id,
            "name": rec.name,
            "state": rec.state,
            "picking_id": rec.picking_id.id,
            "picking_name": rec.picking_id.name,
            "picks": self.yms_get_picks(),
        }
