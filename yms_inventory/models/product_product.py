# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class ProductProduct(models.Model):
    _inherit = "product.product"

    @api.model
    def yms_get_pipe_products(self):
        """Serial-tracked storable products used as YMS pipe/material master."""
        products = self.search(
            [("is_storable", "=", True), ("tracking", "=", "serial")],
            order="name",
        )
        return [
            {
                "id": product.id,
                "name": product.display_name,
                "default_code": product.default_code or "",
                "uom": product.uom_id.name,
                "active": product.active,
                "company_id": product.company_id.id or False,
            }
            for product in products
        ]

    @api.model
    def yms_get_material_availability(self, product_id, required_qty=0.0):
        """Inventory availability for Production/MPS. Does not plan production."""
        product = self.browse(int(product_id or 0))
        if not product.exists():
            raise UserError(_("Product not found."))
        try:
            required = float(required_qty or 0.0)
        except (TypeError, ValueError):
            raise UserError(_("Required quantity is invalid."))
        if required < 0:
            raise UserError(_("Required quantity cannot be negative."))

        Lot = self.env["stock.lot"]
        pipes = []
        available = 0.0
        reserved = 0.0
        locations = {}
        for quant in Lot._yms_inventory_quants().filtered(lambda q: q.product_id == product):
            loc = quant.location_id
            avail = self.env["stock.quant"]._get_available_quantity(
                product, loc, lot_id=quant.lot_id, strict=True
            )
            reserved += quant.reserved_quantity or 0.0
            if loc.yms_location_type == "plate" and avail > 0:
                available += avail
                yard, bin_name, plate = Lot._yms_location_parts(loc)
                pipes.append(
                    {
                        "lot_id": quant.lot_id.id,
                        "pipe_id": quant.lot_id.name,
                        "qty": avail,
                        "reserved": quant.reserved_quantity or 0.0,
                        "location_id": loc.id,
                        "location": loc.complete_name,
                        "yard": yard,
                        "bin": bin_name,
                        "plate": plate,
                        "quality": quant.lot_id.yms_quality_status,
                    }
                )
                key = loc.id
                if key not in locations:
                    locations[key] = {
                        "location_id": loc.id,
                        "location": loc.complete_name,
                        "yard": yard,
                        "bin": bin_name,
                        "plate": plate,
                        "available": 0.0,
                    }
                locations[key]["available"] += avail
        shortage = max(required - available, 0.0)
        return {
            "product_id": product.id,
            "product": product.display_name,
            "required_qty": required,
            "available_qty": available,
            "reserved_qty": reserved,
            "shortage_qty": shortage,
            "sufficient": shortage <= 0,
            "locations": list(locations.values()),
            "pipes": pipes,
        }
