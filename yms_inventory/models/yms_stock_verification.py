# -*- coding: utf-8 -*-

from odoo import api, fields, models


class YmsStockVerification(models.Model):
    """Reconciliation record only. Does not change stock.quant quantity."""

    _name = "yms.stock.verification"
    _description = "YMS Stock Verification"
    _order = "verify_date desc, id desc"

    name = fields.Char(string="Session", copy=False, index=True)
    lot_id = fields.Many2one("stock.lot", string="Pipe / Serial", required=True, index=True, ondelete="cascade")
    location_id = fields.Many2one("stock.location", string="Location", required=True, index=True)
    product_id = fields.Many2one("product.product", string="Product", required=True)
    system_qty = fields.Float(string="System Quantity", digits="Product Unit of Measure")
    physical_qty = fields.Float(string="Physical Quantity", digits="Product Unit of Measure")
    variance = fields.Float(string="Variance", digits="Product Unit of Measure")
    status = fields.Selection(
        [
            ("matched", "Matched"),
            ("shortage", "Shortage"),
            ("excess", "Excess"),
        ],
        string="Verification Status",
        required=True,
        index=True,
    )
    verify_date = fields.Datetime(string="Verification Date", required=True, default=fields.Datetime.now, index=True)
    user_id = fields.Many2one("res.users", string="Verified By", required=True, default=lambda self: self.env.user)
    remarks = fields.Text(string="Remarks")

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for rec in records:
            if not rec.name:
                rec.name = "SV-%04d" % rec.id
        return records
