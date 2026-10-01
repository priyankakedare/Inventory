# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class YmsStockReceive(models.TransientModel):
    _name = "yms.stock.receive"
    _description = "YMS Inventory Receiving"

    product_id = fields.Many2one(
        "product.product",
        string="Material / Product",
        required=True,
        domain="[('is_storable', '=', True), ('tracking', '=', 'serial')]",
    )
    product_qty = fields.Integer(string="Quantity", compute="_compute_product_qty")
    origin = fields.Char(string="Source / Reference")
    scheduled_date = fields.Datetime(string="Receiving Date", required=True, default=fields.Datetime.now)
    line_ids = fields.One2many("yms.stock.receive.line", "wizard_id", string="Pipe IDs")

    @api.depends("line_ids.pipe_id")
    def _compute_product_qty(self):
        for wizard in self:
            wizard.product_qty = len(wizard.line_ids.filtered("pipe_id"))

    def _execute_receive(self):
        self.ensure_one()
        if not self.product_id:
            raise UserError(_("Select a product."))
        names = [name.strip() for name in self.line_ids.mapped("pipe_id") if name and name.strip()]
        return self.env["stock.picking"].yms_receive_pipes_to_pending(
            self.product_id,
            names,
            origin=self.origin,
            scheduled_date=self.scheduled_date,
        )

    def action_receive(self):
        picking = self._execute_receive()
        return {
            "type": "ir.actions.act_window",
            "name": _("Receipt"),
            "res_model": "stock.picking",
            "res_id": picking.id,
            "view_mode": "form",
            "target": "current",
        }

    def action_receive_ui(self):
        """JSON result for the YMS OWL Receiving screen."""
        picking = self._execute_receive()
        return {
            "picking_id": picking.id if picking else False,
            "picking_name": picking.name if picking else "WH/Pending",
            "quantity": len(self.line_ids.filtered("pipe_id")),
        }


class YmsStockReceiveLine(models.TransientModel):
    _name = "yms.stock.receive.line"
    _description = "YMS Inventory Receiving Line"

    wizard_id = fields.Many2one("yms.stock.receive", required=True, ondelete="cascade")
    pipe_id = fields.Char(string="Pipe ID / Serial", required=True)

    @api.constrains("pipe_id")
    def _check_pipe_id(self):
        for line in self:
            if line.pipe_id and not line.pipe_id.strip():
                raise UserError(_("Pipe ID cannot be empty."))
