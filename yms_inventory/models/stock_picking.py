# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class StockPicking(models.Model):
    _inherit = "stock.picking"

    @api.model
    def yms_receive_pipes_to_pending(self, product, pipe_names, origin=False, scheduled_date=False):
        """Receive serial-tracked pipes into WH/Pending via a standard incoming transfer.

        Creates/uses stock.lot (Pipe ID = lot name), then validates so stock.quant
        is created at the Pending location (provisional inventory).
        """
        product = product if hasattr(product, "_name") else self.env["product.product"].browse(product)
        if not product:
            raise UserError(_("Select a product."))
        if not product.is_storable:
            raise UserError(_("Only storable products can be received into inventory."))
        if product.tracking != "serial":
            raise UserError(_("YMS receiving supports serial-tracked pipe products only."))

        names = []
        seen = set()
        for raw in pipe_names or []:
            name = str(raw).strip()
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                raise UserError(_("Duplicate Pipe ID: %s") % name)
            seen.add(key)
            names.append(name)
        if not names:
            raise UserError(_("Enter at least one Pipe ID."))

        pending = self.env["stock.location"]._get_yms_pending_location()
        if not pending:
            raise UserError(_("YMS Pending location was not found. Upgrade the YMS Inventory module."))

        company = product.company_id or self.env.company
        warehouse = self.env["stock.warehouse"].search([("company_id", "=", company.id)], limit=1)
        if not warehouse or not warehouse.in_type_id:
            raise UserError(_("No incoming operation type was found for this company."))

        picking_type = warehouse.in_type_id
        location_src = picking_type.default_location_src_id or self.env.ref("stock.stock_location_suppliers")
        when = scheduled_date or fields.Datetime.now()
        Lot = self.env["stock.lot"]
        lots = Lot.browse()
        to_receive = Lot.browse()
        for name in names:
            lot = Lot.search(
                [
                    ("name", "=", name),
                    ("product_id", "=", product.id),
                    ("company_id", "=", company.id),
                ],
                limit=1,
            )
            if not lot:
                lot = Lot.create(
                    {
                        "name": name,
                        "product_id": product.id,
                        "company_id": company.id,
                    }
                )
            lots |= lot
            pending_qty = sum(
                lot.quant_ids.filtered(lambda q: q.location_id == pending and q.quantity > 0).mapped("quantity")
            )
            if pending_qty > 0:
                continue
            others = lot.quant_ids.filtered(
                lambda q: q.quantity > 0 and q.location_id.usage == "internal" and q.location_id != pending
            )
            if others:
                self._yms_move_lot_qty_to_pending(lot, pending)
                continue
            to_receive |= lot

        if not to_receive:
            return self.search(
                [("location_dest_id", "=", pending.id), ("state", "=", "done"), ("origin", "=", origin or False)],
                limit=1,
                order="id desc",
            )

        qty = len(to_receive)
        picking = self.create(
            {
                "picking_type_id": picking_type.id,
                "location_id": location_src.id,
                "location_dest_id": pending.id,
                "origin": origin or False,
                "scheduled_date": when,
                "company_id": company.id,
            }
        )
        move = self.env["stock.move"].create(
            {
                "name": product.display_name,
                "product_id": product.id,
                "product_uom": product.uom_id.id,
                "product_uom_qty": qty,
                "picking_id": picking.id,
                "location_id": location_src.id,
                "location_dest_id": pending.id,
                "picking_type_id": picking_type.id,
                "company_id": company.id,
                "date": when,
            }
        )
        picking.action_confirm()
        move.move_line_ids.unlink()
        for lot in to_receive:
            self.env["stock.move.line"].create(
                {
                    "picking_id": picking.id,
                    "move_id": move.id,
                    "product_id": product.id,
                    "product_uom_id": product.uom_id.id,
                    "location_id": location_src.id,
                    "location_dest_id": pending.id,
                    "lot_id": lot.id,
                    "quantity": 1,
                    "company_id": company.id,
                }
            )
        picking.with_context(skip_backorder=True).button_validate()
        self._yms_move_lot_qty_to_pending(to_receive, pending)
        return picking

    def _yms_move_lot_qty_to_pending(self, lots, pending=None):
        """Put YMS serial qty onto WH/Pending so Quality Check can see it."""
        pending = pending or self.env["stock.location"]._get_yms_pending_location()
        if not pending:
            return
        Quant = self.env["stock.quant"].sudo()
        for lot in lots:
            pending_qty = sum(
                lot.quant_ids.filtered(lambda q: q.location_id == pending and q.quantity > 0).mapped("quantity")
            )
            if pending_qty > 0:
                continue
            others = lot.quant_ids.filtered(
                lambda q: q.quantity > 0 and q.location_id.usage == "internal" and q.location_id != pending
            )
            moved = 0.0
            for quant in others:
                qty = quant.quantity
                Quant._update_available_quantity(lot.product_id, quant.location_id, -qty, lot_id=lot)
                Quant._update_available_quantity(lot.product_id, pending, qty, lot_id=lot)
                moved += qty
            if moved <= 0:
                Quant._update_available_quantity(lot.product_id, pending, 1.0, lot_id=lot)

    def _yms_internal_lot_prepare(self, lot, src, dest, qty, origin=False, note=False, require_plate_dest=True):
        """Create and assign an internal transfer. Does not validate."""
        lot.ensure_one()
        src.ensure_one()
        dest.ensure_one()
        qty = float(qty or 0.0)
        if qty <= 0:
            raise UserError(_("Quantity must be greater than zero."))
        if not lot.exists():
            raise UserError(_("Pipe not found."))
        if src == dest:
            raise UserError(_("From and To locations must be different."))
        if dest.usage != "internal":
            raise UserError(_("Destination must be an internal location."))
        if require_plate_dest and (dest.yms_location_type != "plate"):
            raise UserError(_("Destination must be a valid YMS Plate location."))
        available = self.env["stock.quant"]._get_available_quantity(
            lot.product_id, src, lot_id=lot, strict=True
        )
        if available < qty:
            raise UserError(_("Requested quantity exceeds available quantity."))

        company = lot.company_id or self.env.company
        warehouse = self.env["stock.warehouse"].search([("company_id", "=", company.id)], limit=1)
        if not warehouse or not warehouse.int_type_id:
            raise UserError(_("No internal transfer type was found for this company."))

        picking_type = warehouse.int_type_id
        picking = self.create(
            {
                "picking_type_id": picking_type.id,
                "location_id": src.id,
                "location_dest_id": dest.id,
                "origin": origin or False,
                "note": note or False,
                "company_id": company.id,
            }
        )
        move = self.env["stock.move"].create(
            {
                "name": lot.product_id.display_name,
                "product_id": lot.product_id.id,
                "product_uom": lot.product_id.uom_id.id,
                "product_uom_qty": qty,
                "picking_id": picking.id,
                "location_id": src.id,
                "location_dest_id": dest.id,
                "picking_type_id": picking_type.id,
                "company_id": company.id,
            }
        )
        picking.action_confirm()
        move.lot_ids = lot
        picking.action_assign()
        if move.move_line_ids:
            move.move_line_ids.write(
                {
                    "lot_id": lot.id,
                    "lot_name": lot.name,
                    "quantity": qty,
                    "picked": True,
                    "location_id": src.id,
                    "location_dest_id": dest.id,
                }
            )
        else:
            self.env["stock.move.line"].create(
                {
                    "move_id": move.id,
                    "product_id": lot.product_id.id,
                    "product_uom_id": lot.product_id.uom_id.id,
                    "location_id": src.id,
                    "location_dest_id": dest.id,
                    "lot_id": lot.id,
                    "lot_name": lot.name,
                    "quantity": qty,
                    "picked": True,
                    "company_id": company.id,
                }
            )
        move.picked = True
        return picking

    def _yms_internal_lot_transfer(self, lot, src, dest, qty, origin=False, note=False, require_plate_dest=True):
        """Internal transfer of a serial/lot from src → dest. Preserves lot and quantity."""
        picking = self._yms_internal_lot_prepare(
            lot, src, dest, qty, origin=origin, note=note, require_plate_dest=require_plate_dest
        )
        picking.with_context(skip_backorder=True).button_validate()
        if picking.state != "done":
            raise UserError(_("The stock transfer could not be validated."))
        return picking

    def _yms_classify_internal_move(self, src, dest):
        if src.yms_location_type == "pending":
            return "Put-away"
        if dest.yms_location_type != "plate":
            return "Retrieval"
        src_yard, _, _ = self.env["stock.lot"]._yms_location_parts(src)
        dest_yard, _, _ = self.env["stock.lot"]._yms_location_parts(dest)
        if src_yard and dest_yard and src_yard != dest_yard:
            return "Yard Transfer"
        return "Bin Transfer"

    def _yms_loc_split(self, location):
        yard, bin_name, plate = self.env["stock.lot"]._yms_location_parts(location)
        top = yard or location.name or ""
        sub = " / ".join([p for p in (bin_name, plate) if p and p != "Pending"])
        return top, sub

    @api.model
    def yms_get_pipe_movements(self):
        pickings = self.search(
            [
                ("picking_type_code", "=", "internal"),
                ("origin", "ilike", "YMS"),
            ],
            order="id desc",
            limit=200,
        )
        rows = []
        for picking in pickings:
            line = picking.move_line_ids[:1]
            if not line:
                continue
            src = line.location_id
            dest = line.location_dest_id
            lot = line.lot_id
            if not lot:
                continue
            live = lot.quant_ids.filtered(
                lambda q: q.quantity > 0 and q.location_id.yms_location_type in ("pending", "plate")
            )
            if not live:
                continue
            from_top, from_sub = self._yms_loc_split(src)
            to_top, to_sub = self._yms_loc_split(dest)
            status_map = {
                "done": "Completed",
                "assigned": "In Progress",
                "confirmed": "In Progress",
                "waiting": "Pending",
                "draft": "Pending",
            }
            rows.append(
                {
                    "id": picking.id,
                    "no": picking.name,
                    "dt": fields.Datetime.to_string(picking.date_done or picking.scheduled_date or picking.create_date),
                    "pipe": lot.name if lot else "",
                    "lot_id": lot.id if lot else False,
                    "material": lot.product_id.display_name if lot else "",
                    "fromTop": from_top,
                    "fromSub": from_sub,
                    "toTop": to_top,
                    "toSub": to_sub,
                    "from": src.complete_name or "",
                    "to": dest.complete_name or "",
                    "type": self._yms_classify_internal_move(src, dest),
                    "qty": line.quantity,
                    "status": status_map.get(picking.state, picking.state),
                    "by": picking.user_id.name or picking.create_uid.name or "",
                    "tone": "purple" if picking.state == "done" else "blue",
                }
            )
        kpi = {
            "total": len(rows),
            "yard": len([r for r in rows if r["type"] == "Yard Transfer"]),
            "bin": len([r for r in rows if r["type"] == "Bin Transfer"]),
            "prod": len([r for r in rows if r["type"] == "To Production"]),
            "dispatch": len([r for r in rows if r["type"] == "To Dispatch"]),
        }
        return {"rows": rows, "kpi": kpi}

    @api.model
    def yms_move_pipe_ui(self, lot_id, yard_id, bin_id, plate_id, qty, from_location_id=None, remarks=None):
        lot = self.env["stock.lot"].browse(lot_id)
        if not lot.exists():
            raise UserError(_("Pipe not found."))
        Location = self.env["stock.location"]
        yard = Location.browse(int(yard_id or 0))
        bin_loc = Location.browse(int(bin_id or 0))
        plate = Location.browse(int(plate_id or 0))
        Location._yms_assert_yard_bin_plate(yard, bin_loc, plate)

        yms_quants = lot.quant_ids.filtered(
            lambda q: q.quantity > 0 and q.location_id.yms_location_type in ("pending", "plate")
        )
        if not yms_quants:
            raise UserError(_("Pipe does not have available stock."))
        if from_location_id:
            match = yms_quants.filtered(lambda q: q.location_id.id == int(from_location_id))
            if not match:
                raise UserError(_("From location is not the actual current location."))
            src = match[0].location_id
        else:
            src = yms_quants[0].location_id

        picking = self._yms_internal_lot_transfer(
            lot,
            src,
            plate,
            qty,
            origin=_("YMS Movement %s") % lot.name,
            note=remarks or False,
        )
        data = self.yms_get_pipe_movements()
        Lot = self.env["stock.lot"]
        return {
            "picking_id": picking.id,
            "picking_name": picking.name,
            "movements": data["rows"],
            "kpi": data["kpi"],
            "pipes": Lot.yms_get_movement_pipes(),
            "yard_board": Lot.yms_get_yard_board(),
        }

    @api.model
    def yms_putaway_lot_to_plate(self, lot, yard, bin_loc, plate):
        """Internal transfer: WH/Pending → selected Plate. Preserves lot and quantity."""
        lot = lot if hasattr(lot, "_name") else self.env["stock.lot"].browse(lot)
        Location = self.env["stock.location"]
        yard = yard if hasattr(yard, "_name") else Location.browse(yard)
        bin_loc = bin_loc if hasattr(bin_loc, "_name") else Location.browse(bin_loc)
        plate = plate if hasattr(plate, "_name") else Location.browse(plate)

        if not lot.exists():
            raise UserError(_("Pipe not found."))
        if not lot.yms_putaway_eligible or lot.yms_quality_status != "passed":
            raise UserError(_("Only quality-passed pipes can be put away."))

        Location._yms_assert_yard_bin_plate(yard, bin_loc, plate)

        pending = Location._get_yms_pending_location()
        if not pending:
            raise UserError(_("YMS Pending location was not found."))
        if plate == pending:
            raise UserError(_("Destination cannot be WH/Pending."))

        qty = lot._yms_pending_qty()
        if qty <= 0:
            raise UserError(_("Pipe does not have stock in WH/Pending."))

        return self._yms_internal_lot_transfer(
            lot,
            pending,
            plate,
            qty,
            origin=_("YMS Put-away %s") % lot.name,
        )

    @api.model
    def yms_get_traceability(self, lot_id=None, pipe_name=None):
        """Movement history from stock.move.line (no duplicate history table)."""
        domain = [("state", "=", "done"), ("quantity", ">", 0)]
        if lot_id:
            domain.append(("lot_id", "=", int(lot_id)))
        elif pipe_name:
            domain.append(("lot_id.name", "=", str(pipe_name).strip()))
        else:
            yms_lots = self.env["stock.quant"].search(
                [
                    ("location_id.yms_location_type", "in", ("pending", "plate")),
                    ("quantity", ">", 0),
                    ("lot_id", "!=", False),
                ]
            ).mapped("lot_id")
            if not yms_lots:
                return []
            domain.append(("lot_id", "in", yms_lots.ids))
        lines = self.env["stock.move.line"].search(domain, order="date desc, id desc", limit=500)
        rows = []
        for line in lines:
            lot = line.lot_id
            picking = line.picking_id
            src = line.location_id
            dest = line.location_dest_id
            rows.append(
                {
                    "move_line_id": line.id,
                    "picking_id": picking.id if picking else False,
                    "document": picking.name if picking else (line.reference or ""),
                    "pipe_id": lot.name if lot else "",
                    "lot_id": lot.id if lot else False,
                    "product": lot.product_id.display_name if lot else "",
                    "from_location": src.complete_name or "",
                    "to_location": dest.complete_name or "",
                    "qty": line.quantity,
                    "date": fields.Datetime.to_string(line.date) if line.date else "",
                    "type": self._yms_classify_internal_move(src, dest) if picking and picking.picking_type_code == "internal" else (picking.picking_type_id.name if picking else ""),
                    "user": (picking.user_id.name if picking and picking.user_id else "") or (line.create_uid.name or ""),
                    "origin": picking.origin if picking else "",
                    "state": picking.state if picking else line.state,
                }
            )
        return rows
