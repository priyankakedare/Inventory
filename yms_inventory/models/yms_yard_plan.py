# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class YmsYardPlan(models.Model):
    """Yard put-away plan from Excel. Does not create stock."""

    _name = "yms.yard.plan"
    _description = "YMS Yard Allocation Plan"
    _order = "id"

    pipe_id = fields.Char(string="Pipe ID", required=True, index=True)
    po = fields.Char(string="PO")
    qc_plan = fields.Char(string="QC Plan")
    move_type = fields.Char(string="Move Type")
    from_location = fields.Char(string="From Location")
    from_yard = fields.Char(string="From Yard")
    from_bin = fields.Char(string="From Bin")
    from_plate = fields.Char(string="From Plate")
    yard = fields.Char(string="Yard")
    bin_name = fields.Char(string="Bin")
    plate = fields.Char(string="Plate")
    sandbox = fields.Char(string="Sandbox")
    layer = fields.Char(string="Layer")
    position = fields.Char(string="Position")
    demo_note = fields.Char(string="Demo Note")
    import_file = fields.Char(string="Last Import File")

    _sql_constraints = [("yms_yard_plan_pipe_uniq", "unique(pipe_id)", "Pipe ID must be unique in the yard plan.")]

    def _as_dict(self):
        self.ensure_one()
        return {
            "id": self.id,
            "pipe_id": self.pipe_id or "",
            "po": self.po or "",
            "qc_plan": self.qc_plan or "",
            "move_type": self.move_type or "Put-away",
            "from_location": self.from_location or "WH / Pending",
            "from_yard": self.from_yard or "",
            "from_bin": self.from_bin or "",
            "from_plate": self.from_plate or "",
            "from_label": self._from_label(),
            "to_label": self._to_label(),
            "yard": self.yard or "",
            "bin": self.bin_name or "",
            "plate": self.plate or "",
            "sandbox": self.sandbox or "",
            "layer": self.layer or "",
            "position": self.position or "",
            "demo_note": self.demo_note or "",
            "import_file": self.import_file or "",
        }

    def _from_label(self):
        self.ensure_one()
        if self.from_yard or self.from_bin or self.from_plate:
            return " / ".join([p for p in (self.from_yard, self.from_bin, self.from_plate) if p])
        return self.from_location or "WH / Pending"

    def _to_label(self):
        self.ensure_one()
        return " / ".join([p for p in (self.yard, self.bin_name, self.plate) if p]) or "—"

    @api.model
    def yms_get_yard_plans(self):
        return [rec._as_dict() for rec in self.search([])]

    @api.model
    def yms_get_yard_import_history(self):
        recs = self.search([("import_file", "!=", False)], limit=50)
        seen = []
        rows = []
        for rec in recs:
            key = rec.import_file
            if key in seen:
                continue
            seen.append(key)
            match = recs.filtered(lambda r: r.import_file == key)
            rows.append(
                {
                    "file": rec.import_file,
                    "user": rec.write_uid.name if rec.write_uid else "",
                    "time": fields.Datetime.to_string(rec.write_date) if rec.write_date else "",
                    "rows": len(match),
                    "status": "Success",
                }
            )
        return rows

    @api.model
    def yms_clear_yard_plans(self):
        recs = self.search([])
        count = len(recs)
        recs.unlink()
        return {"cleared": count, "rows": [], "history": []}

    @api.model
    def yms_import_yard_file(self, filename, content):
        Inbound = self.env["yms.inbound.po"]
        name = str(filename or "").lower()
        payload = Inbound._yms_decode_upload(content)
        if not name.endswith(".xlsx") and not name.endswith(".csv"):
            raise UserError(_("Upload an Excel .xlsx or CSV file."))
        if name.endswith(".csv"):
            rows = [Inbound._yms_alias_row(row) for row in Inbound._yms_csv_rows(payload)]
        else:
            rows = Inbound._yms_yard_sheet_rows(payload)
        if rows and rows[0].get("po") and rows[0].get("material_code") and not rows[0].get("yard") and not rows[0].get("sandbox"):
            raise UserError(_("This looks like the Inbound file. Import it on PO Import."))
        if not rows:
            raise UserError(_("No yard rows found. Use sheet Yard_Plan."))
        created = 0
        updated = 0
        for mapped in rows:
            pipe_id = (mapped.get("pipe_id") or mapped.get("pipe") or "").strip()
            if not pipe_id:
                continue
            to_yard = mapped.get("yard") or mapped.get("to_yard") or ""
            to_bin = mapped.get("bin") or mapped.get("bin_name") or mapped.get("to_bin") or ""
            to_plate = mapped.get("plate") or mapped.get("to_plate") or ""
            from_yard = mapped.get("from_yard") or ""
            from_bin = mapped.get("from_bin") or ""
            from_plate = mapped.get("from_plate") or ""
            from_location = mapped.get("from_location") or mapped.get("from") or ""
            if not from_location:
                if from_yard or from_bin or from_plate:
                    from_location = " / ".join([p for p in (from_yard, from_bin, from_plate) if p])
                else:
                    from_location = "WH / Pending"
            note = mapped.get("demo_note") or mapped.get("use_in_demo") or mapped.get("inventory_change") or ""
            if not note:
                to_label = " / ".join([p for p in (to_yard, to_bin, to_plate) if p]) or "—"
                note = "From %s → %s. Old location empties, new location gets this pipe." % (from_location, to_label)
            vals = {
                "pipe_id": pipe_id,
                "po": mapped.get("po") or "",
                "qc_plan": mapped.get("qc_plan") or mapped.get("qc") or "",
                "move_type": mapped.get("move_type") or mapped.get("movement_type") or "Put-away",
                "from_location": from_location,
                "from_yard": from_yard,
                "from_bin": from_bin,
                "from_plate": from_plate,
                "yard": to_yard,
                "bin_name": to_bin,
                "plate": to_plate,
                "sandbox": mapped.get("sandbox") or "",
                "layer": mapped.get("layer") or "",
                "position": mapped.get("position") or "",
                "demo_note": note,
                "import_file": filename,
            }
            vals = {key: value for key, value in vals.items() if key in self._fields}
            existing = self.search([("pipe_id", "=", pipe_id)], limit=1)
            if existing:
                existing.write(vals)
                updated += 1
            else:
                self.create(vals)
                created += 1
        if not created and not updated:
            raise UserError(_("Each yard row needs a Pipe ID."))
        return {
            "created": created,
            "updated": updated,
            "total": created + updated,
            "rows": self.yms_get_yard_plans(),
            "history": self.yms_get_yard_import_history(),
        }
