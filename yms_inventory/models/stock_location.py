# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class StockLocation(models.Model):
    _inherit = "stock.location"

    yms_location_type = fields.Selection(
        selection=[
            ("pending", "Pending"),
            ("yard", "Yard"),
            ("bin", "Bin"),
            ("plate", "Plate"),
        ],
        string="YMS Location Type",
        index=True,
        help="YMS classification on standard stock locations. Leave empty for non-YMS locations.",
    )

    @api.model
    def _yms_attach_to_warehouse_view(self):
        """Put Pending and Yard-01 under the warehouse view location (WH/Pending, not WH/Stock/Pending)."""
        warehouse = self.env.ref("stock.warehouse0", raise_if_not_found=False)
        if not warehouse:
            warehouse = self.env["stock.warehouse"].search(
                [("company_id", "=", self.env.company.id)], limit=1
            )
        if not warehouse or not warehouse.view_location_id:
            return True
        view = warehouse.view_location_id
        for xmlid in (
            "yms_inventory.stock_location_yms_pending",
            "yms_inventory.stock_location_yms_yard_01",
            "yms_inventory.stock_location_yms_yard_02",
        ):
            loc = self.env.ref(xmlid, raise_if_not_found=False)
            if loc and loc.location_id != view:
                loc.location_id = view.id
        return True

    @api.model
    def _get_yms_pending_location(self):
        """WH/Pending: provisional inventory location for newly received pipes."""
        loc = self.env.ref("yms_inventory.stock_location_yms_pending", raise_if_not_found=False)
        if loc:
            return loc
        return self.search(
            [("yms_location_type", "=", "pending"), ("usage", "=", "internal")],
            limit=1,
        )

    @api.model
    def yms_get_putaway_locations(self):
        """Yard / Bin / Plate records for Inventory put-away (standard stock.location)."""
        yards = self.search([("yms_location_type", "=", "yard")])
        bins = self.search([("yms_location_type", "=", "bin")])
        plates = self.search([("yms_location_type", "=", "plate"), ("usage", "=", "internal")])
        return {
            "yards": [{"id": loc.id, "name": loc.name} for loc in yards],
            "bins": [{"id": loc.id, "name": loc.name, "yard_id": loc.location_id.id} for loc in bins],
            "plates": [{"id": loc.id, "name": loc.name, "bin_id": loc.location_id.id} for loc in plates],
        }

    @api.model
    def _yms_assert_yard_bin_plate(self, yard, bin_loc, plate):
        if not yard or yard.yms_location_type != "yard":
            raise UserError(_("Select a valid YMS Yard location."))
        if not bin_loc or bin_loc.yms_location_type != "bin" or bin_loc.location_id != yard:
            raise UserError(_("Bin must belong to the selected Yard."))
        if not plate or plate.yms_location_type != "plate" or plate.usage != "internal":
            raise UserError(_("Select a valid YMS Plate location."))
        if plate.location_id != bin_loc:
            raise UserError(_("Plate must belong to the selected Bin."))
        return True

    @api.model
    def yms_get_settings(self):
        """Company, live YMS locations, users, and saved Inventory settings."""
        import json

        ICP = self.env["ir.config_parameter"].sudo()
        try:
            saved = json.loads(ICP.get_param("yms_inventory.settings_json") or "{}")
        except json.JSONDecodeError:
            saved = {}
        if not isinstance(saved, dict):
            saved = {}
        company = self.env.company
        warehouses = self.env["stock.warehouse"].search([], limit=5)
        loc = self.yms_get_putaway_locations()
        yards = loc.get("yards") or []
        bins = loc.get("bins") or []
        plates = loc.get("plates") or []
        yard_rows = []
        for yard in yards:
            yard_bins = [b for b in bins if b.get("yard_id") == yard["id"]]
            bin_ids = {b["id"] for b in yard_bins}
            yard_plates = [p for p in plates if p.get("bin_id") in bin_ids]
            yard_rows.append(
                {
                    "section": yard["name"],
                    "bays": len(yard_bins),
                    "stacks": max(len(yard_bins), 1),
                    "layers": int(saved.get("layers") or 4),
                    "positions": len(yard_plates),
                    "status": "Active",
                }
            )
        if not yard_rows:
            yard_rows = saved.get("yard_structure") or [
                {"section": "Yard-01", "bays": 4, "stacks": 10, "layers": 5, "positions": 10, "status": "Active"},
            ]
        users = []
        for user in self.env["res.users"].search([("share", "=", False)], limit=20, order="name"):
            role, access = self._yms_user_access(user)
            users.append(
                {
                    "id": user.id,
                    "name": user.name,
                    "login": user.login,
                    "role": role,
                    "access": access,
                    "status": "Active" if user.active else "Inactive",
                }
            )
        pickings = self.env["stock.picking"].search(
            ["|", ("origin", "ilike", "PO-"), ("origin", "ilike", "YMS")],
            limit=8,
            order="id desc",
        )
        logs = [
            {
                "time": fields.Datetime.to_string(p.write_date or p.create_date) or "",
                "event": "%s %s" % (p.name, p.origin or ""),
                "status": p.state,
            }
            for p in pickings
        ]
        defaults = self._yms_default_settings()
        data = {**defaults, **saved}
        data.update(
            {
                "company_name": data.get("company_name") or company.name,
                "plant": data.get("plant") or (warehouses[:1].name if warehouses else "Plant 1"),
                "default_yard": data.get("default_yard") or (yards[0]["name"] if yards else "Yard-01"),
                "warehouse": ", ".join(warehouses.mapped("name")),
                "yard_structure": yard_rows,
                "users": users,
                "devices": data.get("devices") or defaults["devices"],
                "integrations": data.get("integrations") or defaults["integrations"],
                "notifications": data.get("notifications") or defaults["notifications"],
                "logs": logs,
            }
        )
        return data

    def _yms_user_access(self, user):
        if user.has_group("base.group_system"):
            return "Administrator", "Full Access"
        if user.has_group("stock.group_stock_manager"):
            return "Dispatch Manager", "Operational"
        if user.has_group("stock.group_stock_user"):
            return "Yard Operator", "Operational"
        return "Viewer", "Read Only"

    def _yms_default_settings(self):
        return {
            "company_name": "",
            "plant": "Plant 1",
            "timezone": "(GMT+05:30) Asia/Kolkata",
            "date_format": "DD MMM YYYY",
            "uom": "Metric (m, kg, ton)",
            "default_yard": "Yard-01",
            "auto_pipe_id": True,
            "require_qc": True,
            "allow_manual_adjust": False,
            "movement_approval": True,
            "default_pipe_status": "Available",
            "history_months": 24,
            "devices": [
                {"name": "Scanner-01", "type": "Barcode Scanner", "location": "Gate 1", "status": "Online"},
                {"name": "Scanner-02", "type": "RFID Reader", "location": "Yard-01", "status": "Online"},
                {"name": "Camera-01", "type": "AI Camera", "location": "Bay 01", "status": "Online"},
                {"name": "Handheld-01", "type": "Mobile Device", "location": "Yard-02", "status": "Offline"},
            ],
            "integrations": [
                {"system": "SAP", "type": "ERP", "status": "Not Configured"},
                {"system": "Production System", "type": "API", "status": "Connected"},
                {"system": "Weighbridge", "type": "API", "status": "Not Configured"},
                {"system": "Camera AI System", "type": "API", "status": "Connected"},
            ],
            "notifications": [
                {"event": "Material Received", "channels": "Email, In-App", "status": "Enabled"},
                {"event": "Stock Low", "channels": "Email, In-App", "status": "Enabled"},
                {"event": "Unauthorized Movement", "channels": "In-App", "status": "Enabled"},
                {"event": "Dispatch Completed", "channels": "Email, In-App", "status": "Enabled"},
            ],
        }

    @api.model
    def yms_save_settings(self, values):
        import json

        values = values or {}
        current = self.yms_get_settings()
        keep = (
            "company_name",
            "plant",
            "timezone",
            "date_format",
            "uom",
            "default_yard",
            "auto_pipe_id",
            "require_qc",
            "allow_manual_adjust",
            "movement_approval",
            "default_pipe_status",
            "history_months",
            "devices",
            "integrations",
            "notifications",
        )
        payload = {key: current.get(key) for key in keep}
        for key in keep:
            if key in values:
                payload[key] = values[key]
        self.env["ir.config_parameter"].sudo().set_param("yms_inventory.settings_json", json.dumps(payload))
        company_name = (payload.get("company_name") or "").strip()
        if company_name and company_name != self.env.company.name:
            self.env.company.sudo().write({"name": company_name})
        return self.yms_get_settings()

