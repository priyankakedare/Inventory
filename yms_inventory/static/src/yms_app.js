/** @odoo-module **/
/* yms-ui-rev-29 foreach-guard */

import { Component, useState, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { standardActionServiceProps } from "@web/webclient/actions/action_service";
import { NAV, GRN_STEPS } from "./mock_data";
import { YMS_ASSET_REV } from "./yms_asset_rev";

export class YmsInventoryApp extends Component {
    static template = "yms_inventory.YmsInventoryApp";
    static props = { ...standardActionServiceProps };

    setup() {
        this.notification = useService("notification");
        this.orm = useService("orm");
        this.poFile = useRef("poFile");
        this.yardFile = useRef("yardFile");
        this.state = useState({
            screen: "dashboard",
            search: "",
            plant: "Plant 1",
            poQuery: "",
            poStatus: "all",
            poSupplier: "all",
            poTab: "list",
            poPage: 1,
            grnStep: 1,
            grnNo: "—",
            selectedPo: "",
            inboundPoId: false,
            inboundPos: [],
            importHistory: [],
            yardPlans: [],
            yardHistory: [],
            yardQuery: "",
            excelMenu: "",
            inboundLastSync: "",
            yardLastSync: "",
            grnPoQuery: "",
            grnPoStatus: "all",
            grnShowFilter: false,
            grnArrival: { datetime: "", truck: "", transporter: "", reference: "", notes: "" },
            dashLive: {
                date: "",
                kpis: [],
                status: [],
                yards: [],
                grns: [],
                movements: [],
                alerts: [],
            },
            configCompany: "",
            configWarehouse: "",
            configLocations: [],
            configUsers: [],
            configEditCompany: false,
            configBusy: false,
            settings: {
                company_name: "",
                plant: "Plant 1",
                timezone: "(GMT+05:30) Asia/Kolkata",
                date_format: "DD MMM YYYY",
                uom: "Metric (m, kg, ton)",
                default_yard: "Yard-01",
                auto_pipe_id: true,
                require_qc: true,
                allow_manual_adjust: false,
                movement_approval: true,
                default_pipe_status: "Available",
                history_months: 24,
                warehouse: "",
                yard_structure: [],
                users: [],
                devices: [],
                integrations: [],
                notifications: [],
                logs: [],
            },
            scan: "",
            selectedPipeId: "P-001",
            moveType: "all",
            moveStatus: "all",
            moveForm: {
                type: "Bin Transfer",
                lotId: "",
                pipe: "",
                qty: 1,
                fromYard: "",
                fromBin: "",
                fromPlate: "",
                toYard: "",
                toBin: "",
                toPlate: "",
                reason: "",
            },
            moveRows: [],
            movePipes: [],
            moveYards: [],
            moveBins: [],
            movePlates: [],
            moveKpiData: { total: 0, yard: 0, bin: 0, prod: 0, dispatch: 0 },
            moveFromYard: "all",
            moveBusy: false,
            moveFormOpen: false,
            moveYardBoard: { rows: [], occupied: 0, empty: 0, total: 0 },
            selectedMoveId: false,
            verifyTab: "verification",
            verifyPipeId: "",
            verifyLotId: false,
            physicalStatus: "Found",
            physicalQty: 1,
            remarks: "",
            verifyRows: [],
            verifyTree: [],
            verifyHistory: [],
            verifyDisc: [],
            verifyYards: [],
            verifyBinList: [],
            verifyPlateList: [],
            verifyProducts: [],
            verifyYard: "all",
            verifyBin: "all",
            verifyPlate: "all",
            verifyProductId: "all",
            verifyVStatus: "progress",
            verifyLocId: 0,
            verifyLocQuery: "",
            verifyScan: "",
            verifyBusy: false,
            pickId: "",
            pickTab: "scan",
            pickScan: "",
            pickQty: 1,
            pickRows: [],
            pickBusy: false,
            pickQuery: "",
            pickStatusFilter: "all",
            pickProductId: "",
            pickOrigin: "",
            availInfo: {
                product_id: false,
                product: "",
                required_qty: 0,
                available_qty: 0,
                reserved_qty: 0,
                shortage_qty: 0,
                sufficient: true,
                pipes: [],
                locations: [],
            },
            histRows: [],
            histBusy: false,
            reportData: {},
            reportMovesLive: [],
            reportBusy: false,
            configTab: "general",
            grnDraft: "Ready to Confirm",
            shortageType: "Shortage / Missing",
            shortageQty: 5,
            shortageReason: "Bundle #B4 count discrepancy at receiving",
            histPipe: "",
            histType: "all",
            histDoc: "INT-0008",
            histDocQ: "",
            provisionalCreated: false,
            invoiceRefStatus: "Pending",
            ymLocApplied: false,
            invStatus: "all",
            invYard: "all",
            invBin: "all",
            invPlate: "all",
            invQuery: "",
            ymYard: "",
            ymBin: "",
            ymPlate: "",
            paRows: [],
            paYards: [],
            paBins: [],
            paPlates: [],
            paLotId: false,
            paBusy: false,
            invProductId: "all",
            selectedInvQuantId: false,
            invYards: [],
            invBinList: [],
            invPlateList: [],
            invProducts: [],
            invKpiData: { total: 0, provisional: 0, located: 0, available: 0, reservedPicked: 0 },
            invStock: [],
            recvProducts: [],
            recvProductId: "",
            recvOrigin: "",
            recvDate: this._localDatetimeValue(new Date()),
            recvLines: [],
            pendingRows: [],
            recvBusy: false,
            qcRows: [],
            qcLotId: false,
            qcStatus: "passed",
            qcRemarks: "",
            qcQuery: "",
            qcFilter: "all",
            qcBusy: false,
            reviewQuery: "",
        });
        onMounted(() => {
            const sheets = [
                ["yms-sv-look-link", "/yms_inventory/static/src/scss/yms_sv_look.css?v=rev24"],
                ["yms-pk-look-link", "/yms_inventory/static/src/scss/yms_pick_look.css?v=rev24"],
                ["yms-hist-look-link", "/yms_inventory/static/src/scss/yms_hist_look.css?v=rev24"],
                ["yms-rp-look-link", "/yms_inventory/static/src/scss/yms_rep_look.css?v=rev24"],
            ];
            for (const [id, href] of sheets) {
                if (document.getElementById(id)) {
                    continue;
                }
                const link = document.createElement("link");
                link.id = id;
                link.rel = "stylesheet";
                link.href = href;
                document.head.appendChild(link);
            }
            this.loadReceiveCatalog();
            this.loadPendingRows();
            this.loadDashboard();
            this.loadInboundPos();
            this.loadYardPlans();
        });
    }

    _arr(value) {
        return Array.isArray(value) ? value : [];
    }
    get nav() {
        return (NAV || []).filter((item) => item.id !== "verification");
    }
    get assetRev() { return YMS_ASSET_REV; }
    get steps() { return GRN_STEPS; }
    get dash() {
        const d = this.state.dashLive || {};
        return {
            date: d.date || "",
            kpis: this._arr(d.kpis),
            status: this._arr(d.status),
            yards: this._arr(d.yards),
            grns: this._arr(d.grns),
            movements: this._arr(d.movements),
            alerts: this._arr(d.alerts),
        };
    }
    get history() { return this._arr(this.state.importHistory); }
    get grnPipes() { return this.grnPipesReview; }
    get invPipes() {
        const q = (this.state.invQuery || "").trim().toLowerCase();
        return this._arr(this.state.invStock).filter((p) => {
            const okS = this.state.invStatus === "all" || (
                this.state.invStatus === "Available"
                    ? p.status === "Located" && !p.reserved
                    : this.state.invStatus === "Picked"
                        ? false
                        : p.status === this.state.invStatus
            );
            const okY = this.state.invYard === "all" || p.yard === this.state.invYard;
            const okB = this.state.invBin === "all" || p.bin === this.state.invBin;
            const okP = this.state.invPlate === "all" || p.plate === this.state.invPlate;
            const okM = this.state.invProductId === "all" || String(p.product_id) === String(this.state.invProductId);
            const okQ = !q || `${p.id} ${p.material} ${p.barcode} ${p.spec} ${p.yard} ${p.bin} ${p.plate}`.toLowerCase().includes(q);
            return okS && okY && okB && okP && okM && okQ;
        });
    }
    get putawayPipes() {
        return this._arr(this.state.paRows).map((p) => ({
            lot_id: p.lot_id,
            id: p.pipe_id,
            material: p.product,
            qty: p.qty,
            quality: p.quality,
            prevLoc: p.prevLoc || "Provisional / Pending",
            yard: p.yard || "—",
            bin: p.bin || "—",
            plate: p.plate || "—",
            loc: p.loc,
            locSource: p.locSource,
            eligible: p.eligible,
        }));
    }
    get paKpi() {
        const rows = this.state.paRows;
        const located = rows.filter((r) => r.loc === "Located").length;
        const pending = rows.filter((r) => r.loc === "Pending").length;
        const accepted = rows.filter((r) => r.status === "passed" || r.eligible).length;
        return { total: rows.length, accepted, located, pending };
    }
    get paBinsFiltered() {
        const yardId = Number(this.state.ymYard);
        return this._arr(this.state.paBins).filter((b) => b.yard_id === yardId);
    }
    get paPlatesFiltered() {
        const binId = Number(this.state.ymBin);
        return this._arr(this.state.paPlates).filter((p) => p.bin_id === binId);
    }
    get paYardLabel() {
        const rec = this.state.paYards.find((y) => String(y.id) === String(this.state.ymYard));
        return rec ? rec.name : this.state.ymYard;
    }
    get paBinLabel() {
        const rec = this.state.paBins.find((b) => String(b.id) === String(this.state.ymBin));
        return rec ? rec.name : this.state.ymBin;
    }
    get paPlateLabel() {
        const rec = this.state.paPlates.find((p) => String(p.id) === String(this.state.ymPlate));
        return rec ? rec.name : this.state.ymPlate;
    }
    get selectedPa() {
        return this.state.paRows.find((r) => r.lot_id === this.state.paLotId) || this.state.paRows[0] || {
            lot_id: false,
            pipe_id: "",
            product: "",
            loc: "Pending",
            eligible: false,
        };
    }
    get paStatusBadgeClass() {
        return this.selectedPa.loc === "Located" ? "is-ok" : "is-warn";
    }
    get paStatusLabel() {
        return this.selectedPa.loc === "Located" ? "Located" : "Pending";
    }
    get movements() {
        return this._arr(this.state.moveRows).filter((m) => {
            const okT = this.state.moveType === "all" || m.type === this.state.moveType;
            const okS = this.state.moveStatus === "all" || m.status === this.state.moveStatus;
            const okY = this.state.moveFromYard === "all" || m.fromTop === this.state.moveFromYard;
            return okT && okS && okY;
        });
    }
    get moveFromYardOptions() {
        const names = this._arr(this.state.moveRows).map((m) => m.fromTop).filter(Boolean);
        return ["all", ...new Set(names)];
    }
    get moveKpi() {
        return this.state.moveKpiData;
    }
    get moveYardBoard() {
        return this.state.moveYardBoard || { rows: [], occupied: 0, empty: 0, total: 0 };
    }
    get moveToPlateInfo() {
        const plateId = Number(this.state.moveForm.toPlate);
        const rows = this._arr(this.moveYardBoard.rows);
        return rows.find((r) => r.id === plateId) || false;
    }
    get selectedMovePipe() {
        const id = Number(this.state.moveForm.lotId);
        return this.state.movePipes.find((p) => p.lot_id === id) || this.state.movePipes[0] || {
            lot_id: false,
            id: "",
            barcode: "",
            material: "",
            spec: "",
            batch: "",
            yard: "",
            bin: "",
            plate: "",
            qty: 0,
            available: 0,
            quality: "",
            location: "",
            location_id: false,
        };
    }
    get moveToBins() {
        const yardId = Number(this.state.moveForm.toYard);
        return this._arr(this.state.moveBins).filter((b) => b.yard_id === yardId);
    }
    get moveToPlates() {
        const binId = Number(this.state.moveForm.toBin);
        return this._arr(this.state.movePlates).filter((p) => p.bin_id === binId);
    }
    get moveCurrentLocation() {
        const row = this.selectedMovePipe;
        return row.location || this.locLine(row);
    }
    get tasks() {
        const q = (this.state.pickQuery || "").trim().toLowerCase();
        const status = this.state.pickStatusFilter;
        return this._arr(this.state.pickRows).filter((t) => {
            const okS = status === "all" || t.statusKey === status;
            const hay = `${t.id} ${t.order} ${t.pipe} ${t.spec}`.toLowerCase();
            return okS && (!q || hay.includes(q));
        });
    }
    get pickKpi() {
        const rows = this.state.pickRows;
        return {
            total: rows.length,
            progress: rows.filter((t) => t.statusKey === "reserved").length,
            done: rows.filter((t) => t.statusKey === "done").length,
            pending: rows.filter((t) => t.statusKey === "draft" || t.statusKey === "cancel").length,
        };
    }
    get moveHistory() {
        const q = (this.state.histPipe || "").trim().toLowerCase();
        const d = (this.state.histDocQ || "").trim().toLowerCase();
        return this._arr(this.state.histRows).filter((h) => {
            const okP = !q || h.pipe.toLowerCase().includes(q) || h.doc.toLowerCase().includes(q);
            const okD = !d || h.doc.toLowerCase().includes(d);
            const okT = this.state.histType === "all" || h.type === this.state.histType;
            return okP && okD && okT;
        });
    }
    get selectedHist() {
        const rows = this.moveHistory;
        return rows.find((h) => h.doc === this.state.histDoc) || rows[0] || {
            pipe: "",
            doc: "",
            type: "",
            dt: "",
            time: "",
            from: "",
            fromLine: "",
            toShow: "",
            toLine: "",
            qty: 0,
            user: "",
            device: "Odoo",
            remarks: "",
            scanSrc: "Inventory",
            scanTime: "",
            scanDev: "Odoo",
            status: "",
            kind: "im",
        };
    }
    get reportMoves() {
        return this.state.reportMovesLive;
    }
    get reportKpi() {
        const d = this.state.reportData || {};
        const inv = d.inventory_summary || {};
        const prov = d.provisional || {};
        const mv = d.pipe_movement || {};
        const pick = d.picking || {};
        const pickDone = (pick.by_state && pick.by_state.done) || 0;
        return {
            total: inv.total || 0,
            inbound: prov.qty || inv.provisional || 0,
            outbound: pickDone,
            internal: (mv.yard || 0) + (mv.bin || 0),
        };
    }
    get reportYardLegend() {
        const rows = (this.state.reportData.stock_by_yard || []).slice();
        const total = rows.reduce((n, r) => n + Number(r.qty || 0), 0) || 1;
        const colors = ["#14b8a6", "#22d3ee", "#eab308", "#f97316", "#8b5cf6"];
        return rows.slice(0, 4).map((r, i) => {
            const qty = Number(r.qty || 0);
            const pct = Math.round((qty / total) * 100);
            return { name: r.name, qty, pct, label: `${qty} (${pct}%)`, color: colors[i % colors.length] };
        });
    }
    get reportStatusBars() {
        const inv = (this.state.reportData.inventory_summary) || {};
        const q = (this.state.reportData.quality_status) || {};
        const items = [
            { n: Number(inv.available || 0), lbl: "Available", color: "#22c55e" },
            { n: Number(inv.reservedPicked || 0), lbl: "In Production", color: "#22d3ee" },
            { n: Number((this.state.reportData.picking && this.state.reportData.picking.by_state && this.state.reportData.picking.by_state.done) || 0), lbl: "Dispatched", color: "#3b82f6" },
            { n: Number(q.hold || 0) + Number(q.failed || 0), lbl: "Quarantine", color: "#ef4444" },
            { n: Number(inv.provisional || 0), lbl: "Others", color: "#c4b5fd" },
        ];
        const max = Math.max(1, ...items.map((i) => i.n));
        return items.map((i) => ({ ...i, height: `${Math.max(8, Math.round((i.n / max) * 92))}%` }));
    }
    get reportTopLocations() {
        const plates = this.state.reportData.stock_by_plate || [];
        const max = Math.max(1, ...plates.map((p) => Number(p.qty || 0)), 1);
        return plates.slice(0, 5).map((p) => ({
            name: p.name,
            qty: p.qty,
            bar: `${Math.round((Number(p.qty || 0) / max) * 100)}%`,
        }));
    }
    get reportInsights() {
        const k = this.reportKpi;
        const v = (this.state.reportData.verification) || {};
        const lines = [
            `Live yard stock is ${k.total} pipes.`,
            `Provisional / inbound remaining: ${k.inbound}. Completed retrievals: ${k.outbound}.`,
            `Internal yard/bin moves: ${k.internal}. Verification records: ${v.count || 0} (shortage ${v.shortage || 0}, excess ${v.excess || 0}).`,
        ];
        return lines;
    }
    get reviewPipes() {
        const q = (this.state.reviewQuery || "").trim().toLowerCase();
        const paMap = {};
        for (const row of this._arr(this.state.paRows)) {
            paMap[row.pipe_id || row.id] = row;
        }
        const qcMap = {};
        for (const row of this._arr(this.state.qcRows)) {
            qcMap[row.pipe_id] = row;
        }
        let ids = this._arr(this.state.recvLines).map((l) => (l.id || "").trim()).filter(Boolean);
        if (!ids.length) {
            ids = this._arr(this.state.paRows).map((r) => r.pipe_id || r.id).filter(Boolean);
        }
        const rows = ids.map((id) => {
            const line = this._arr(this.state.recvLines).find((l) => l.id === id) || {};
            const pa = paMap[id] || {};
            const qc = qcMap[id] || {};
            const quality = pa.quality || qc.status_label || qc.result || "Pending";
            const qkey = String(pa.status || qc.status || quality || "").toLowerCase();
            const located = pa.loc === "Located";
            let invStatus = "—";
            let loc = "—";
            if (this.state.provisionalCreated) {
                if (qkey.includes("fail") || qkey.includes("reject")) {
                    invStatus = "Blocked";
                    loc = "Blocked";
                } else if (located) {
                    invStatus = "Located";
                    loc = "Located";
                } else {
                    invStatus = "PROVISIONAL";
                    loc = "Pending";
                }
            }
            return {
                id,
                barcode: line.barcode || id,
                material: line.material || pa.product || pa.material || "",
                spec: line.spec || "—",
                qty: line.received || pa.qty || 1,
                quality,
                invStatus,
                yard: located ? (pa.yard || "—") : "—",
                bin: located ? (pa.bin || "—") : "—",
                plate: located ? (pa.plate || "—") : "—",
                loc,
            };
        });
        return rows.filter((r) => !q || `${r.id} ${r.material} ${r.spec}`.toLowerCase().includes(q));
    }
    get reviewKpi() {
        const po = this.selectedGrnPo || {};
        const pipes = this.reviewPipes;
        const ordered = Number(po.ordered || pipes.length || 0);
        const received = this.state.provisionalCreated ? pipes.length : 0;
        const accepted = pipes.filter((p) => /pass|accepted/i.test(String(p.quality))).length;
        const hold = pipes.filter((p) => /hold/i.test(String(p.quality))).length;
        const failed = pipes.filter((p) => /fail|reject/i.test(String(p.quality))).length;
        const located = pipes.filter((p) => p.loc === "Located").length;
        const pending = pipes.filter((p) => p.invStatus === "PROVISIONAL" || p.loc === "Pending").length;
        const pct = ordered ? Math.round((received / ordered) * 100) : 0;
        const locatedRow = pipes.find((p) => p.loc === "Located");
        return {
            po: po.po || this.state.selectedPo || "—",
            supplier: po.supplier || "—",
            date: po.date || "—",
            eta: po.eta || "—",
            plant: po.plant || "Plant 1",
            status: po.status || "—",
            ordered,
            received,
            pct,
            variance: received - ordered,
            accepted,
            hold,
            failed,
            located,
            pending,
            grnNo: this.state.grnNo || "—",
            recvDate: (this.state.recvDate || "").replace("T", " ") || "—",
            invoice: this.state.invoiceRefStatus || "Pending",
            yard: locatedRow ? locatedRow.yard : "—",
            bin: locatedRow ? locatedRow.bin : "—",
            plate: locatedRow ? locatedRow.plate : "—",
        };
    }
    get reviewChecks() {
        const k = this.reviewKpi;
        const poOk = Boolean(this.state.selectedPo);
        const recvOk = Boolean(this.state.provisionalCreated);
        const qcDone = k.received > 0 && k.accepted + k.hold + k.failed === k.received;
        const locOk = k.located > 0;
        return [
            { ok: poOk, text: poOk ? `PO ${k.po} selected` : "PO not selected" },
            { ok: recvOk, text: recvOk ? `GRN ${k.grnNo} received (${k.received} pipes)` : "Receiving not completed" },
            { ok: qcDone, text: qcDone ? `Quality saved: ${k.accepted} passed, ${k.hold} hold, ${k.failed} failed` : "Quality check still pending on some pipes" },
            { ok: locOk, text: locOk ? `${k.located} pipe(s) located from Yard Data` : "No pipe located yet" },
            { ok: k.pending === 0, text: k.pending ? `${k.pending} pipe(s) still Provisional / Pending` : "No pipes waiting for put-away" },
            { ok: true, text: `Invoice reference: ${k.invoice}` },
        ];
    }
    get attachments() { return []; }
    get verifyPipes() {
        const q = (this.state.verifyLocQuery || "").trim().toLowerCase();
        const scan = (this.state.verifyScan || "").trim().toLowerCase();
        const v = this.state.verifyVStatus;
        return this._arr(this.state.verifyRows).filter((p) => {
            const hay = `${p.id} ${p.barcode} ${p.material} ${p.spec}`.toLowerCase();
            const okQ = !q || hay.includes(q);
            const okScan = !scan || hay.includes(scan);
            let okV = true;
            if (v === "pending") {
                okV = !p.verify_status;
            } else if (v === "completed") {
                okV = Boolean(p.verify_status);
            } else if (v === "progress") {
                okV = true;
            }
            return okQ && okScan && okV;
        });
    }
    get selectedVerify() {
        return this.state.verifyRows.find((p) => p.lot_id === this.state.verifyLotId)
            || this.verifyPipes[0]
            || {
                id: "",
                barcode: "",
                material: "",
                spec: "",
                qty: 0,
                verify_label: "In Stock",
                verify_status: "",
                variance: 0,
            };
    }
    get verifyKpi() {
        const rows = this.state.verifyRows;
        const done = rows.filter((p) => p.checked).length;
        const disc = rows.filter((p) => p.verify_status === "shortage" || p.verify_status === "excess").length;
        const total = rows.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const discPct = total ? Math.round((disc / total) * 100) : 0;
        return {
            total,
            verified: done,
            pending: total - done,
            disc,
            pct,
            pendingPct: 100 - pct,
            discPct,
        };
    }
    get verifyLocLabel() {
        const node = this.state.verifyTree.find((n) => n.id === this.state.verifyLocId);
        if (node) {
            return node.label || `${node.yard} / ${node.bin} / ${node.plate}`;
        }
        return "All YMS Locations";
    }
    get verifyTreeFiltered() {
        const rows = this._arr(this.state.verifyTree);
        const q = (this.state.verifyLocQuery || "").trim().toLowerCase();
        if (!q) {
            return rows;
        }
        return rows.filter((n) => `${n.label} ${n.name} ${n.yard} ${n.bin} ${n.plate}`.toLowerCase().includes(q));
    }
    get verifyTreeTotal() {
        return this.state.verifyTree.reduce((n, node) => n + Number(node.qty || 0), 0);
    }
    get verifyAllLocClass() {
        return this.state.verifyLocId ? "n n1" : "n n1 on";
    }
    get verifyBarStyle() {
        return `width: ${this.verifyKpi.pct}%`;
    }
    verifyNodeClass(node) {
        const level = node.loc_type === "pending" ? "n1" : (node.loc_type === "plate" ? "n3" : "n2");
        const on = this.state.verifyLocId === node.id ? "on" : "";
        return `n ${level} ${on}`.trim();
    }

    histTone(tone) {
        return `o_yms__hist-dot is-${tone}`;
    }

    priorityClass(p) {
        const s = (p || "").toLowerCase();
        if (s === "high") { return "is-bad"; }
        if (s === "low") { return "is-ok"; }
        return "is-warn";
    }
    get grnPipesReview() {
        const lines = this._arr(this.state.recvLines);
        if (lines.length) {
            return lines;
        }
        return this._arr(this.state.pendingRows);
    }
    get grnRecvRows() {
        const po = this.selectedGrnPo || {};
        const posted = Boolean(this.state.provisionalCreated);
        const grnNo = posted ? (this.state.grnNo || "—") : "—";
        const invoice = posted ? (this.state.invoiceRefStatus || "Pending") : "Pending";
        const date = (this.state.recvDate || "").replace("T", " ");
        return this.grnPipesReview
            .filter((p) => (p.id || "").trim())
            .map((p) => ({
            ...p,
            grnNo,
            poNo: this.state.selectedPo || p.po || "—",
            supplier: po.supplier || "—",
            qty: p.received || p.expected || 1,
            date: date || "—",
            invStatus: posted ? "PROVISIONAL" : "—",
            locStatus: posted ? "PENDING" : "—",
            invoiceStatus: invoice,
        }));
    }
    get grnFlow() {
        const po = Boolean(this.state.selectedPo);
        const grn = Boolean(this.state.provisionalCreated);
        const invoice = this.state.invoiceRefStatus || "Pending";
        return {
            po,
            grn,
            provisional: grn,
            invoice,
            invoiceOn: grn && invoice !== "Pending",
            invoiceDone: invoice === "Invoice Received",
        };
    }
    get recvQty() {
        return this.state.recvLines.filter((l) => (l.id || "").trim()).length;
    }
    get recvHasVariance() {
        return this.grnPipesReview.some((p) => Number(p.variance || 0) !== 0);
    }
    get recvProductName() {
        const id = Number(this.state.recvProductId);
        const rec = this.state.recvProducts.find((p) => p.id === id);
        return rec ? rec.display_name : "";
    }
    get recvSourceLabel() {
        return this.state.recvOrigin || this.state.selectedPo || "Source";
    }

    get searchPlaceholder() {
        const map = {
            dashboard: "Search PO, Pipe ID, GRN, Truck No, Bin, Plate...",
            po_import: "Search PO, Supplier, Material...",
            inventory: "Search Pipe ID, Barcode, Material, Bin, Plate, Yard...",
            movement: "Search Pipe ID, Barcode, Material, Bin, Plate, Yard...",
            verification: "Search Pipe ID, Barcode, Material, Location...",
            picking: "Search (Order No., Pipe ID, Task ID...)",
            history: "Search (Pipe ID, Document No...)",
            reports: "Search PO, Pipe ID, GRN, Truck No, Bin, Plate...",
        };
        return map[this.state.screen] || "Search PO, Pipe ID, GRN, Truck No, Bin, Plate...";
    }

    get pos() {
        return this._arr(this.state.inboundPos).filter((p) => {
            const q = (this.state.poQuery || "").trim().toLowerCase();
            const okQ = !q || `${p.po} ${p.supplier} ${p.material}`.toLowerCase().includes(q);
            const okS = this.state.poStatus === "all" || p.status === this.state.poStatus;
            const okV = this.state.poSupplier === "all" || p.supplier === this.state.poSupplier;
            return okQ && okS && okV;
        });
    }
    get yardRows() {
        const q = (this.state.yardQuery || "").trim().toLowerCase();
        return this._arr(this.state.yardPlans).filter((row) => {
            if (!q) {
                return true;
            }
            return `${row.pipe_id} ${row.po} ${row.yard} ${row.bin} ${row.plate} ${row.from_location || ""} ${row.move_type || ""}`.toLowerCase().includes(q);
        });
    }
    get yardKpi() {
        const rows = this._arr(this.state.yardPlans);
        return {
            total: rows.length,
            located: rows.filter((r) => r.plate).length,
            hold: rows.filter((r) => String(r.qc_plan || "").toLowerCase() === "hold").length,
            failed: rows.filter((r) => String(r.qc_plan || "").toLowerCase() === "fail").length,
        };
    }
    get inboundSyncLabel() {
        return this.state.inboundLastSync ? `Last Sync: ${this.state.inboundLastSync}` : "Last Sync: never";
    }
    get yardSyncLabel() {
        return this.state.yardLastSync ? `Last Sync: ${this.state.yardLastSync}` : "Last Sync: never";
    }

    get suppliers() {
        return ["all", ...new Set((this.state.inboundPos || []).map((p) => p.supplier).filter(Boolean))];
    }

    get poKpi() {
        const rows = this.state.inboundPos || [];
        return {
            total: rows.length,
            open: rows.filter((p) => p.status === "Open").length,
            partial: rows.filter((p) => (p.status || "").includes("Partial")).length,
            closed: rows.filter((p) => p.status === "Closed").length,
        };
    }

    get grnPos() {
        return (this.state.inboundPos || []).filter((p) => {
            const q = (this.state.grnPoQuery || "").trim().toLowerCase();
            const okQ = !q || `${p.po} ${p.supplier} ${p.material}`.toLowerCase().includes(q);
            const okS = this.state.grnPoStatus === "all" || p.status === this.state.grnPoStatus;
            return okQ && okS;
        });
    }

    get selectedGrnPo() {
        return (this.state.inboundPos || []).find((p) => p.po === this.state.selectedPo) || false;
    }

    get grnMaterials() {
        const rec = this.selectedGrnPo;
        return rec ? this._arr(rec.materials) : [];
    }

    get invKpi() {
        return this.state.invKpiData;
    }
    get dashBin() {
        const used = Number((this.state.invKpiData || {}).located || 0);
        const cap = 120;
        const pct = used ? Math.min(100, Math.round((used / cap) * 100)) : 0;
        return { used, cap, free: Math.max(0, cap - used), pct, freePct: 100 - pct };
    }
    get invYardRows() {
        const map = {};
        for (const p of this.state.invStock) {
            const y = p.yard || "—";
            if (!map[y]) {
                map[y] = { yard: y, total: 0, available: 0, reserved: 0, hold: 0, rejected: 0 };
            }
            map[y].total += Number(p.qty || 0);
            map[y].available += Number(p.available || 0);
            map[y].reserved += Number(p.reserved || 0);
            if (p.quality_status === "hold") {
                map[y].hold += Number(p.qty || 0);
            }
            if (p.quality_status === "failed") {
                map[y].rejected += Number(p.qty || 0);
            }
        }
        const rows = Object.values(map);
        const tot = rows.reduce(
            (acc, r) => ({
                total: acc.total + r.total,
                available: acc.available + r.available,
                reserved: acc.reserved + r.reserved,
                hold: acc.hold + r.hold,
                rejected: acc.rejected + r.rejected,
            }),
            { total: 0, available: 0, reserved: 0, hold: 0, rejected: 0 }
        );
        return { rows, tot };
    }
    get invBinUsage() {
        const map = {};
        for (const p of this.state.invStock) {
            if (!p.bin || p.bin === "Pending" || p.bin === "—") {
                continue;
            }
            if (!map[p.bin]) {
                map[p.bin] = { name: p.bin, used: 0, available: 0 };
            }
            map[p.bin].used += Number(p.qty || 0);
            map[p.bin].available += Number(p.available || 0);
        }
        const rows = Object.values(map);
        const max = Math.max(1, ...rows.map((r) => r.used), 1);
        return rows.map((r) => {
            const pct = Math.round((r.used / max) * 100);
            return { ...r, pct, bar: `${pct}%` };
        });
    }
    get invQualityDist() {
        const kpi = this.invKpi;
        const total = Number(kpi.total || 0) || 0;
        const hold = this.state.invStock.filter((p) => p.quality_status === "hold").reduce((n, p) => n + Number(p.qty || 0), 0);
        const rejected = this.state.invStock.filter((p) => p.quality_status === "failed").reduce((n, p) => n + Number(p.qty || 0), 0);
        const pct = (n) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
        return {
            total,
            available: kpi.available,
            reserved: kpi.reservedPicked,
            hold,
            rejected,
            availablePct: pct(kpi.available),
            reservedPct: pct(kpi.reservedPicked),
            holdPct: pct(hold),
            rejectedPct: pct(rejected),
        };
    }

    get histKpi() {
        const rows = this.state.histRows;
        return {
            total: rows.length,
            inbound: rows.filter((h) => h.type === "Put-away").length,
            internal: rows.filter((h) => h.type === "Internal Move").length,
            outbound: rows.filter((h) => h.type === "Outbound" || h.type === "Picking").length,
            adj: rows.filter((h) => h.type === "Adjustment").length,
        };
    }

    resetHistFilters() {
        return this.resetAllScreens();
    }

    resetMoveFilters() {
        return this.resetAllScreens();
    }

    get invLastTo() {
        const row = this.selectedInv;
        return row.lastTo || this.locLine(row);
    }

    get selectedInv() {
        const rows = this.invPipes;
        return rows.find((p) => p.quant_id === this.state.selectedInvQuantId)
            || rows.find((p) => p.id === this.state.selectedPipeId)
            || rows[0]
            || {
                id: "",
                material: "",
                spec: "",
                yard: "",
                bin: "",
                plate: "",
                qty: 0,
                quality: "",
                status: "",
                last: "",
                barcode: "",
                batch: "",
                locSource: "",
                lastFrom: "",
                lastTo: "",
                lastType: "",
                lastUser: "",
                location: "",
            };
    }

    get selectedGrnPipe() {
        if (this.state.grnStep === 4) {
            const row = this.selectedPa;
            return { id: row.pipe_id, material: row.product || "" };
        }
        const rows = this.grnPipesReview;
        return rows.find((p) => p.id === this.state.selectedPipeId) || rows[0] || {
            id: "",
            material: this.recvProductName,
            spec: "",
            barcode: "",
            batch: "",
        };
    }
    get qcPipes() {
        const q = (this.state.qcQuery || "").trim().toLowerCase();
        const filter = this.state.qcFilter;
        return this._arr(this.state.qcRows).filter((row) => {
            const hay = `${row.pipe_id} ${row.barcode} ${row.product}`.toLowerCase();
            const okQ = !q || hay.includes(q);
            const okS = filter === "all" || row.status === filter;
            return okQ && okS;
        });
    }
    get selectedQc() {
        return this.state.qcRows.find((row) => row.lot_id === this.state.qcLotId) || this.state.qcRows[0] || {
            lot_id: false,
            pipe_id: "",
            product: "",
            qty: 0,
            status: "pending",
            status_label: "Pending",
            result: "Pending",
            remarks: "",
            checked_by: "",
            date: false,
        };
    }
    get qcInspectLine() {
        const row = this.selectedQc;
        const when = row.date || "Not inspected";
        const who = row.checked_by || "Current user";
        return `${when} — ${who}`;
    }
    get qcRemarksHint() {
        return this.selectedQc.remarks || "Enter remarks, then save the quality check.";
    }
    get qcKpi() {
        const rows = this.state.qcRows;
        const count = (status) => rows.filter((r) => r.status === status).length;
        const total = rows.length;
        const passed = count("passed");
        const hold = count("hold");
        const failed = count("failed");
        const pct = (n) => (total ? `${((n / total) * 100).toFixed(1)}%` : "0%");
        return { total, passed, hold, failed, passedPct: pct(passed), holdPct: pct(hold), failedPct: pct(failed) };
    }

    get selectedTask() {
        const rows = this.tasks.length ? this.tasks : this.state.pickRows;
        return rows.find((t) => t.id === this.state.pickId)
            || rows[0]
            || {
                id: "",
                pickDbId: false,
                order: "",
                type: "Inventory Retrieval",
                pipe: "",
                spec: "",
                source: "",
                dest: "",
                qty: 0,
                picked: 0,
                status: "Pending",
                statusKey: "draft",
                priority: "Medium",
                assignee: "",
                date: "",
                yard: "",
                bin: "",
                plate: "",
                quality: "",
            };
    }
    get scanPipeInfo() {
        const scan = (this.state.pickScan || "").trim().toLowerCase();
        const pipes = this.state.availInfo.pipes || [];
        const match = pipes.find((p) => String(p.pipe_id || "").toLowerCase() === scan);
        if (match) {
            return {
                pipe: match.pipe_id,
                spec: this.state.availInfo.product || "",
                qty: match.qty,
                source: match.location,
                yard: match.yard,
                bin: match.bin,
                plate: match.plate,
                quality: match.quality === "passed" ? "Approved" : (match.quality || "—"),
                status: this.selectedTask.status,
            };
        }
        const t = this.selectedTask;
        return {
            pipe: t.pipe,
            spec: t.spec,
            qty: this.state.availInfo.available_qty || t.qty,
            source: t.source,
            yard: t.yard,
            bin: t.bin,
            plate: t.plate,
            quality: t.quality || "Approved",
            status: t.status,
        };
    }

    get breadcrumb() {
        const map = {
            dashboard: "Inventory Dashboard",
            po_import: "Inventory  >  PO Import",
            yard_import: "Inventory  >  Yard Data",
            grn: "Inventory  >  GRN / Receiving  >  Create GRN",
            inventory: "Inventory  >  Inventory & Location",
            movement: "Inventory  >  Pipe Movement",
            verification: "Inventory  >  Stock Verification",
            picking: "Inventory  >  Picking / Retrieval",
            history: "Inventory  >  Movement History",
            reports: "Reports",
            config: "Settings",
        };
        return map[this.state.screen];
    }

    go(screen) {
        this.state.screen = screen;
        this.state.moveFormOpen = false;
        if (screen === "dashboard") {
            this.loadDashboard();
        }
        if (screen === "po_import") {
            this.loadInboundPos();
        }
        if (screen === "yard_import") {
            this.loadYardPlans();
        }
        if (screen === "config") {
            this.loadConfig();
        }
        if (screen === "grn") {
            this.state.grnStep = 1;
            this.state.selectedPo = "";
            this.state.inboundPoId = false;
            this.state.provisionalCreated = false;
            this.state.invoiceRefStatus = "Pending";
            this.state.grnNo = "—";
            this._resetGrnArrival();
            this.loadInboundPos();
            this.loadPendingRows();
        }
        if (screen === "inventory") {
            this.loadInventory();
        }
        if (screen === "movement") {
            this.loadMovement();
        }
        if (screen === "picking") {
            this.loadPicking();
            this.loadAvailability();
        }
        if (screen === "history") {
            this.loadHistory();
        }
        if (screen === "reports") {
            this.loadReports();
        }
    }

    setStep(step) {
        if (this.state.screen === "grn" && step > 1 && !this.state.selectedPo) {
            this.notify("Select a purchase order before continuing.", "warning");
            return;
        }
        this.state.grnStep = step;
        if (step === 2) {
            this.state.recvOrigin = this.state.selectedPo || this.state.recvOrigin;
        }
        if (step === 3) {
            this.loadQcPipes();
        }
        if (step === 4) {
            this.loadPutaway();
        }
        if (step === 5) {
            this.loadQcPipes();
            this.loadPutaway();
            this.loadInventory();
        }
    }

    notify(msg, type = "success") {
        this.notification.add(msg, { type });
    }

    downloadTemplate() {
        this._downloadStaticFile("/yms_inventory/static/src/xlsx/YMS_Inbound_Input.xlsx", "YMS_Inbound_Input.xlsx");
        this.state.excelMenu = "";
        this.notify("Inbound Excel downloaded. Import it on PO Import.");
    }

    downloadYardTemplate() {
        this._downloadStaticFile("/yms_inventory/static/src/xlsx/YMS_Yard_Allocation.xlsx", "YMS_Yard_Allocation.xlsx");
        this.state.excelMenu = "";
        this.notify("Yard Excel downloaded. Import it on Yard Data.");
    }

    toggleExcelMenu(which) {
        this.state.excelMenu = this.state.excelMenu === which ? "" : which;
    }

    sapSyncHint() {
        this.notify("SAP is not connected. Use Import from Excel.", "warning");
    }

    importExcel() {
        this.state.excelMenu = "";
        if (this.poFile.el) {
            this.poFile.el.click();
        }
    }

    importYardExcel() {
        this.state.excelMenu = "";
        if (this.yardFile.el) {
            this.yardFile.el.click();
        }
    }

    _syncStamp() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    }

    async resetAllScreens() {
        if (!window.confirm("Clear imported Excel data and YMS stock from every Inventory screen?")) {
            return;
        }
        try {
            await this.orm.call("stock.lot", "yms_reset_screens", []);
            this._wipeScreenState();
            this.notify("Data cleared. All Inventory screens are empty.");
            this.go(this.state.screen);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not clear screen data."), "danger");
        }
    }

    _wipeScreenState() {
        this.state.inboundPos = [];
        this.state.importHistory = [];
        this.state.inboundLastSync = "";
        this.state.yardPlans = [];
        this.state.yardHistory = [];
        this.state.yardLastSync = "";
        this.state.recvLines = [];
        this.state.pendingRows = [];
        this.state.qcRows = [];
        this.state.paRows = [];
        this.state.invStock = [];
        this.state.moveRows = [];
        this.state.movePipes = [];
        this.state.pickRows = [];
        this.state.moveYardBoard = { rows: [], occupied: 0, empty: 0, total: 0 };
        this.state.provisionalCreated = false;
        this.state.selectedPo = "";
        this.state.inboundPoId = false;
        this.state.grnNo = "—";
        this.state.dashLive = {
            date: "",
            kpis: [],
            status: [],
            yards: [],
            grns: [],
            movements: [],
            alerts: [],
        };
    }

    async clearInboundData() {
        return this.resetAllScreens();
    }

    async clearYardData() {
        return this.resetAllScreens();
    }

    _downloadStaticFile(href, filename) {
        const link = document.createElement("a");
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
    async onPoFile(ev) {
        const file = ev.target.files && ev.target.files[0];
        ev.target.value = "";
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const b64 = String(reader.result || "").split(",")[1] || "";
                const result = await this.orm.call("yms.inbound.po", "yms_import_inbound_file", [file.name, b64]);
                this.state.inboundPos = result.rows || [];
                this.state.importHistory = result.history || [];
                const yard = result.yard || {};
                const extra = yard.seeded ? ` Yard pipes created ${yard.seeded}, skipped ${yard.skipped || 0}.` : "";
                this.notify(`Imported ${result.total} PO(s). Created ${result.created}, updated ${result.updated}.${extra}`);
                this.state.inboundLastSync = this._syncStamp();
                this.state.excelMenu = "";
            } catch (error) {
                this.notify(this._rpcErrorMessage(error, "Import failed."), "danger");
            }
        };
        reader.readAsDataURL(file);
    }
    async onYardFile(ev) {
        const file = ev.target.files && ev.target.files[0];
        ev.target.value = "";
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const b64 = String(reader.result || "").split(",")[1] || "";
                const result = await this.orm.call("yms.yard.plan", "yms_import_yard_file", [file.name, b64]);
                this.state.yardPlans = result.rows || [];
                this.state.yardHistory = result.history || [];
                this.state.yardLastSync = this._syncStamp();
                this.notify(`Imported ${result.total} yard row(s). Created ${result.created}, updated ${result.updated}. No stock was created.`);
            } catch (error) {
                this.notify(this._rpcErrorMessage(error, "Yard import failed."), "danger");
            }
        };
        reader.readAsDataURL(file);
    }
    openGrn(po) {
        this.state.screen = "grn";
        this.state.grnStep = 1;
        this.state.provisionalCreated = false;
        this.state.invoiceRefStatus = "Pending";
        this.state.grnNo = "—";
        this.state.ymLocApplied = false;
        this.state.grnDraft = "Ready to Confirm";
        this.loadInboundPos().then(() => {
            if (po) {
                this.selectGrnPo(po);
            } else {
                this.state.selectedPo = "";
                this._resetGrnArrival();
            }
        });
        this.loadPendingRows();
    }
    saveDraft() {
        this.state.grnDraft = "Draft";
        this.state.recvOrigin = this.state.selectedPo || this.state.recvOrigin;
        this.notify("Draft saved in this session. Receive still posts stock only when you confirm receiving.");
    }
    async confirmGrn() {
        if (!this.state.provisionalCreated) {
            const ok = await this.receiveToPending();
            if (!ok) {
                return;
            }
        }
        this.notify("GRN confirmed. Opening Inventory & Location.");
        this.go("inventory");
    }
    createProvisionalInventory() {
        return this.receiveToPending();
    }
    applyYardLocation() {
        return this.confirmPutaway();
    }
    resetInvFilters() {
        return this.resetAllScreens();
    }
    selectInvRow(row) {
        if (!row) {
            return;
        }
        this.state.selectedInvQuantId = row.quant_id;
        this.state.selectedPipeId = row.id;
    }
    createMovement() {
        return this.confirmPipeMove();
    }
    saveVerify() {
        return this.confirmVerification();
    }
    confirmPick() {
        return this.completeOrCreatePick(true);
    }

    selectPickRow(task) {
        if (!task) {
            return;
        }
        this.state.pickId = task.id;
        this.state.pickQty = task.qty || 1;
        this.state.pickScan = task.pipe || "";
        this.state.pickOrigin = task.order || "";
        if (task.spec && this.state.recvProducts.length) {
            const rec = this.state.recvProducts.find((p) => p.display_name === task.spec);
            if (rec) {
                this.state.pickProductId = String(rec.id);
                this.loadAvailability();
            }
        }
    }

    stepIsDone(st) {
        return this.state.grnStep > st.id;
    }

    stepClass(st) {
        if (this.state.grnStep === st.id) {
            return "o_yms__step is-on";
        }
        if (this.state.grnStep > st.id) {
            return "o_yms__step is-done";
        }
        return "o_yms__step";
    }

    statusOn(name) {
        return this.state.grnDraft === name ? "on" : "";
    }

    setInvoiceRef(status) {
        if (!this.state.provisionalCreated) {
            this.notify("Create the GRN first. Invoice status follows received quantity.", "warning");
            return;
        }
        this.state.invoiceRefStatus = status;
    }

    invoiceRefClass(status) {
        if (status === "Invoice Received") {
            return "o_yms__badge is-ok";
        }
        if (status === "Invoice Created") {
            return "o_yms__badge is-info";
        }
        return "o_yms__badge is-warn";
    }

    grnFlowClass(done, current) {
        if (done) {
            return "o_yms__flow-step is-done";
        }
        if (current) {
            return "o_yms__flow-step is-on";
        }
        return "o_yms__flow-step";
    }

    locLine(p) {
        if (!p) {
            return "";
        }
        if (p.location) {
            return p.location;
        }
        if (p.yard === "Pending" || p.yard === "WH / Pending" || p.status === "Provisional") {
            return "WH / Pending (Provisional)";
        }
        return `${p.yard} / ${p.bin} / ${p.plate}`;
    }

    moveSummary(m) {
        return `${m.no}  ${m.pipe} moved from ${m.from} to ${m.to}`;
    }

    moveMeta(m) {
        return `${m.dt}  By: ${m.by}`;
    }

    stepLabel(st) {
        return `${st.id}. ${st.label}`;
    }

    varianceClass(p) {
        return p.variance < 0 ? "is-neg" : "";
    }

    rowNum(index) {
        return index + 1;
    }

    alertIcon(tone) {
        if (tone === "yellow") {
            return "fa fa-exclamation-triangle";
        }
        if (tone === "blue") {
            return "fa fa-info-circle";
        }
        return "fa fa-exclamation-circle";
    }

    badgeClass(status) {
        const s = (status || "").toLowerCase();
        if (["received", "accepted", "confirmed", "completed", "success", "available", "closed", "pass", "passed", "assigned", "online", "enabled", "active", "connected", "found", "verified", "in stock", "approved", "located", "matched"].includes(s)) {
            return "is-ok";
        }
        if (["partial", "partially", "partially received", "quality hold", "in receiving", "in progress", "in transit", "pending", "on hold", "open", "provisional", "reserved", "picked", "hold"].includes(s)) {
            return "is-warn";
        }
        if (["rejected", "fail", "failed", "blocked", "offline", "not configured", "shortage", "excess"].includes(s)) {
            return "is-bad";
        }
        return "is-info";
    }

    _localDatetimeValue(date) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    _toOdooDatetime(local) {
        if (!local) {
            return false;
        }
        const d = new Date(local);
        if (Number.isNaN(d.getTime())) {
            return false;
        }
        return d.toISOString().slice(0, 19).replace("T", " ");
    }

    _rpcErrorMessage(error, fallback = "Request failed.") {
        const data = error && error.data;
        let msg = (data && data.message) || (error && error.message) || fallback;
        msg = String(msg).replace(/^odoo\.exceptions\.\w+:\s*/i, "");
        if (msg.toLowerCase().includes("traceback")) {
            return fallback;
        }
        return msg;
    }

    _emptyRecvLine() {
        return {
            id: "",
            barcode: "—",
            material: this.recvProductName,
            spec: "—",
            length: "—",
            diameter: "—",
            grade: "—",
            batch: "—",
            expected: 1,
            received: 1,
            variance: 0,
            readonly: false,
        };
    }

    addRecvPipe(fromScan = false) {
        const line = this._emptyRecvLine();
        const typed = (this.state.scan || "").trim();
        if (fromScan || typed) {
            if (!typed) {
                this.notify("Enter a Pipe ID to scan.", "danger");
                return;
            }
            line.id = typed;
            line.barcode = typed;
            this.state.scan = "";
        }
        this.state.recvLines.push(line);
        this.state.selectedPipeId = line.id;
    }

    onRecvScanKey(ev) {
        if (ev.key === "Enter") {
            ev.preventDefault();
            this.addRecvPipe(true);
        }
    }

    async loadReceiveCatalog() {
        try {
            const products = await this.orm.searchRead(
                "product.product",
                [["is_storable", "=", true], ["tracking", "=", "serial"]],
                ["name", "display_name", "default_code"],
                { limit: 80, order: "name" }
            );
            this.state.recvProducts = products;
            if (!this.state.recvProductId) {
                const pipe = products.find((p) => p.default_code === "PIPE-24") || products[0];
                if (pipe) {
                    this.state.recvProductId = String(pipe.id);
                }
            }
            if (!this.state.pickProductId && this.state.recvProductId) {
                this.state.pickProductId = this.state.recvProductId;
            }
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        }
    }

    async loadPendingRows() {
        try {
            const locs = await this.orm.searchRead(
                "stock.location",
                [["yms_location_type", "=", "pending"]],
                ["id"],
                { limit: 1 }
            );
            if (!locs.length) {
                this.state.pendingRows = [];
                return;
            }
            const quants = await this.orm.searchRead(
                "stock.quant",
                [["location_id", "=", locs[0].id], ["quantity", ">", 0], ["lot_id", "!=", false]],
                ["product_id", "lot_id", "quantity"],
                { limit: 80, order: "id desc" }
            );
            this.state.pendingRows = quants.map((q) => {
                const lotName = Array.isArray(q.lot_id) ? q.lot_id[1] : "";
                const productName = Array.isArray(q.product_id) ? q.product_id[1] : "";
                return {
                    id: lotName,
                    barcode: lotName,
                    material: productName,
                    spec: "—",
                    length: "—",
                    diameter: "—",
                    grade: "—",
                    batch: "—",
                    expected: q.quantity,
                    received: q.quantity,
                    variance: 0,
                    readonly: true,
                };
            });
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        }
    }

    _markReceivedToPending(result) {
        this.state.recvLines = this.state.recvLines.filter((l) => (l.id || "").trim());
        for (const line of this.state.recvLines) {
            line.readonly = true;
        }
        this.state.scan = "";
        this.state.grnDraft = "Confirmed";
        this.state.provisionalCreated = true;
        this.state.invoiceRefStatus = "Pending";
        this.state.grnNo = (result && result.picking_name) || this.state.grnNo || "GRN";
        this.state.screen = "grn";
        if (this.state.grnStep !== 2) {
            this.state.grnStep = 2;
        }
    }

    async receiveToPending() {
        if (this.state.recvBusy) {
            return;
        }
        const productId = Number(this.state.recvProductId);
        const pipes = this.state.recvLines.map((l) => (l.id || "").trim()).filter(Boolean);
        if (!productId) {
            this.notify("Select a product.", "danger");
            return;
        }
        if (!pipes.length) {
            this.notify("Enter at least one Pipe ID.", "danger");
            return;
        }
        const qty = this.recvQty;
        if (qty !== pipes.length) {
            this.notify("Quantity must match the number of Pipe IDs.", "danger");
            return;
        }
        this.state.recvBusy = true;
        let posted = false;
        try {
            const created = await this.orm.create("yms.stock.receive", [{
                product_id: productId,
                origin: (this.state.recvOrigin || this.state.selectedPo || "").trim() || false,
                scheduled_date: this._toOdooDatetime(this.state.recvDate) || false,
            }]);
            const wizardId = Array.isArray(created) ? created[0] : created;
            await this.orm.create("yms.stock.receive.line", pipes.map((pipe_id) => ({
                wizard_id: wizardId,
                pipe_id,
            })));
            const result = await this.orm.call("yms.stock.receive", "action_receive_ui", [[wizardId]]);
            this._markReceivedToPending(result);
            const ref = result && result.picking_name ? ` ${result.picking_name}` : "";
            this.notify(`Received to Pending.${ref ? " Receipt" + ref + "." : ""} Stock is Provisional in WH/Pending. Stay on GRN and click Proceed to Quality Check.`);
            await this.loadPendingRows();
            posted = true;
        } catch (error) {
            const msg = this._rpcErrorMessage(error);
            if (/already exists in inventory/i.test(msg)) {
                this._markReceivedToPending(false);
                this.notify("These Pipe IDs are already in WH/Pending (or already in stock). Stay on GRN and click Proceed to Quality Check.", "warning");
                await this.loadPendingRows();
                posted = true;
            } else {
                this.notify(msg, "danger");
            }
        } finally {
            this.state.recvBusy = false;
        }
        return posted;
    }

    applyQcRows(rows) {
        this.state.qcRows = rows || [];
        if (!this.state.qcRows.length) {
            this.state.qcLotId = false;
            return;
        }
        const current = this.state.qcRows.find((r) => r.lot_id === this.state.qcLotId);
        this.selectQcRow(current || this.state.qcRows[0]);
    }

    selectQcRow(row) {
        if (!row) {
            return;
        }
        this.state.qcLotId = row.lot_id;
        this.state.qcStatus = row.status === "pending" ? "passed" : row.status;
        this.state.qcRemarks = row.remarks || "";
        this.state.selectedPipeId = row.pipe_id;
    }

    async loadQcPipes() {
        try {
            const pipes = this._arr(this.state.recvLines).map((l) => (l.id || "").trim()).filter(Boolean);
            let rows = [];
            try {
                rows = await this.orm.call("stock.lot", "yms_ensure_pipes_in_pending", [pipes]);
            } catch (error) {
                rows = await this.orm.call("stock.lot", "yms_get_pending_quality_pipes", []);
            }
            this.applyQcRows(rows);
            if (!(rows || []).length) {
                this.notify("No pipes in WH/Pending. Go back and click Receive to Pending first.", "warning");
            }
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        }
    }

    async saveQcCheck() {
        if (this.state.qcBusy) {
            return;
        }
        const lotId = this.state.qcLotId || this.selectedQc.lot_id;
        if (!lotId) {
            this.notify("Pipe not found.", "danger");
            return;
        }
        const status = this.state.qcStatus;
        if (!status || status === "pending") {
            this.notify("Select Passed, Failed, or Hold.", "danger");
            return;
        }
        if ((status === "failed" || status === "hold") && !(this.state.qcRemarks || "").trim()) {
            this.notify("Remarks are required for Failed or Hold.", "danger");
            return;
        }
        this.state.qcBusy = true;
        try {
            const rows = await this.orm.call("stock.lot", "yms_save_quality_check_ui", [
                lotId,
                status,
                this.state.qcRemarks || false,
            ]);
            this.applyQcRows(rows);
            this.notify(`Quality ${status} saved. Stock remains in WH/Pending.`);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        } finally {
            this.state.qcBusy = false;
        }
    }

    applyPaRows(rows) {
        this.state.paRows = rows || [];
        const keep = this.state.paRows.find((r) => r.lot_id === this.state.paLotId);
        const first = keep || this.state.paRows[0];
        this.state.paLotId = first ? first.lot_id : false;
        this.state.ymLocApplied = this.state.paRows.some((r) => r.loc === "Located");
        if (first && first.pipe_id) {
            this.state.selectedPipeId = first.pipe_id;
            this.applyImportedYardToPa(first.pipe_id);
        }
    }

    applyImportedYardToPa(pipeId) {
        const plan = this._arr(this.state.yardPlans).find((p) => p.pipe_id === pipeId);
        if (!plan || !plan.yard) {
            return;
        }
        const yard = this.state.paYards.find((y) => (y.name || "").toLowerCase() === String(plan.yard).toLowerCase());
        if (yard) {
            this.state.ymYard = String(yard.id);
        }
        this.onPaYardChange();
        const bin = this.paBinsFiltered.find((b) => (b.name || "").toLowerCase() === String(plan.bin || "").toLowerCase());
        if (bin) {
            this.state.ymBin = String(bin.id);
        }
        this.onPaBinChange();
        const plate = this.paPlatesFiltered.find((p) => (p.name || "").toLowerCase() === String(plan.plate || "").toLowerCase());
        if (plate) {
            this.state.ymPlate = String(plate.id);
        }
    }

    _defaultPaLocations() {
        const yards = this.state.paYards;
        if (!yards.length) {
            this.state.ymYard = "";
            this.state.ymBin = "";
            this.state.ymPlate = "";
            return;
        }
        if (!this.state.ymYard || !yards.some((y) => String(y.id) === String(this.state.ymYard))) {
            this.state.ymYard = String(yards[0].id);
        }
        this.onPaYardChange();
    }

    onPaYardChange() {
        const bins = this.paBinsFiltered;
        if (!bins.some((b) => String(b.id) === String(this.state.ymBin))) {
            this.state.ymBin = bins.length ? String(bins[0].id) : "";
        }
        this.onPaBinChange();
    }

    onPaBinChange() {
        const plates = this.paPlatesFiltered;
        if (!plates.some((p) => String(p.id) === String(this.state.ymPlate))) {
            this.state.ymPlate = plates.length ? String(plates[0].id) : "";
        }
    }

    selectPaRow(row) {
        if (!row || !row.lot_id) {
            return;
        }
        this.state.paLotId = row.lot_id;
        this.state.selectedPipeId = row.id || row.pipe_id;
        this.applyImportedYardToPa(this.state.selectedPipeId);
    }

    async loadPutaway() {
        try {
            const loc = await this.orm.call("stock.location", "yms_get_putaway_locations", []);
            this.state.paYards = loc.yards || [];
            this.state.paBins = loc.bins || [];
            this.state.paPlates = loc.plates || [];
            this._defaultPaLocations();
            if (!this.state.yardPlans.length) {
                await this.loadYardPlans();
            }
            const rows = await this.orm.call("stock.lot", "yms_get_putaway_pipes", []);
            this.applyPaRows(rows);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        }
    }

    async confirmPutaway() {
        if (this.state.paBusy) {
            return;
        }
        const row = this.selectedPa;
        if (!row.lot_id) {
            this.notify("Pipe not found.", "danger");
            return;
        }
        if (!row.eligible || row.status === "failed" || row.status === "hold") {
            this.notify("Only quality-passed pipes in WH/Pending can be put away.", "danger");
            return;
        }
        const yardId = Number(this.state.ymYard);
        const binId = Number(this.state.ymBin);
        const plateId = Number(this.state.ymPlate);
        if (!yardId || !binId || !plateId) {
            this.notify("Select Yard, Bin, and Plate.", "danger");
            return;
        }
        this.state.paBusy = true;
        try {
            const result = await this.orm.call("stock.lot", "yms_putaway_ui", [
                row.lot_id,
                yardId,
                binId,
                plateId,
            ]);
            this.applyPaRows(result.pipes || []);
            this.state.paLotId = row.lot_id;
            this.notify(`Put-away confirmed${result.picking_name ? ` (${result.picking_name})` : ""}.`);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        } finally {
            this.state.paBusy = false;
        }
    }

    async loadInventory(useFilters = false) {
        try {
            const kwargs = useFilters
                ? {
                    query: this.state.invQuery || "",
                    status: this.state.invStatus,
                    yard: this.state.invYard,
                    bin_name: this.state.invBin,
                    plate_name: this.state.invPlate,
                    product_id: this.state.invProductId === "all" ? 0 : Number(this.state.invProductId),
                }
                : {
                    query: "",
                    status: "all",
                    yard: "all",
                    bin_name: "all",
                    plate_name: "all",
                    product_id: 0,
                };
            const result = await this.orm.call("stock.lot", "yms_get_inventory_pipes", [], kwargs);
            this.state.invStock = result.rows || [];
            this.state.invKpiData = result.kpi || this.state.invKpiData;
            this.state.invYards = result.yards || [];
            this.state.invBinList = result.bins || [];
            this.state.invPlateList = result.plates || [];
            this.state.invProducts = result.products || [];
            const keep = this.state.invStock.find((p) => p.quant_id === this.state.selectedInvQuantId);
            const first = keep || this.state.invStock[0];
            if (first) {
                this.state.selectedInvQuantId = first.quant_id;
                this.state.selectedPipeId = first.id;
            } else {
                this.state.selectedInvQuantId = false;
            }
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        }
    }

    searchInventory() {
        return this.loadInventory(true);
    }

    applyMovementScreen(result) {
        this.state.movePipes = result.pipes || [];
        this.state.moveYards = result.yards || [];
        this.state.moveBins = result.bins || [];
        this.state.movePlates = result.plates || [];
        this.state.moveRows = result.movements || [];
        this.state.moveKpiData = result.kpi || this.state.moveKpiData;
        if (result.yard_board) {
            this.state.moveYardBoard = result.yard_board;
        }
        if (!this.state.moveForm.lotId && this.state.movePipes.length) {
            this.state.moveForm.lotId = String(this.state.movePipes[0].lot_id);
        }
        this.onMovePipeChange();
    }

    onMovePipeChange() {
        const row = this.selectedMovePipe;
        this.state.moveForm.pipe = row.id || "";
        this.state.moveForm.fromYard = row.yard || "";
        this.state.moveForm.fromBin = row.bin || "";
        this.state.moveForm.fromPlate = row.plate || "";
        this.state.moveForm.qty = row.available || row.qty || 1;
        this._defaultMoveDest(row.location_id);
    }

    _defaultMoveDest(fromLocationId) {
        const plates = this.state.movePlates;
        const other = plates.find((p) => p.id !== fromLocationId) || plates[0];
        if (!other) {
            this.state.moveForm.toYard = "";
            this.state.moveForm.toBin = "";
            this.state.moveForm.toPlate = "";
            return;
        }
        this.state.moveForm.toPlate = String(other.id);
        this.state.moveForm.toBin = String(other.bin_id);
        const bin = this.state.moveBins.find((b) => b.id === other.bin_id);
        this.state.moveForm.toYard = bin ? String(bin.yard_id) : "";
    }

    onMoveToYardChange() {
        const bins = this.moveToBins;
        if (!bins.some((b) => String(b.id) === String(this.state.moveForm.toBin))) {
            this.state.moveForm.toBin = bins.length ? String(bins[0].id) : "";
        }
        this.onMoveToBinChange();
    }

    onMoveToBinChange() {
        const plates = this.moveToPlates;
        if (!plates.some((p) => String(p.id) === String(this.state.moveForm.toPlate))) {
            this.state.moveForm.toPlate = plates.length ? String(plates[0].id) : "";
        }
    }

    openMoveForm() {
        this.state.moveFormOpen = true;
        this.clearMoveForm();
    }
    closeMoveForm() {
        this.state.moveFormOpen = false;
    }
    setMoveType(type) {
        this.state.moveForm.type = type;
    }
    clearMoveForm() {
        this.state.moveForm.type = "Bin Transfer";
        this.state.moveForm.reason = "";
        if (this.state.movePipes.length) {
            this.state.moveForm.lotId = String(this.state.movePipes[0].lot_id);
            this.onMovePipeChange();
        }
    }

    selectMoveRow(row) {
        if (!row) {
            return;
        }
        this.state.selectedMoveId = row.id;
        if (row.lot_id) {
            this.state.moveForm.lotId = String(row.lot_id);
            this.onMovePipeChange();
        }
    }

    async loadMovement() {
        try {
            const result = await this.orm.call("stock.lot", "yms_get_movement_screen", []);
            this.applyMovementScreen(result);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        }
    }

    async confirmPipeMove() {
        if (this.state.moveBusy) {
            return;
        }
        const type = this.state.moveForm.type;
        if (type === "To Production" || type === "To Dispatch") {
            this.notify("Production and Dispatch moves are not implemented. Use Yard or Bin Transfer to a Plate.", "danger");
            return;
        }
        const row = this.selectedMovePipe;
        if (!row.lot_id) {
            this.notify("Pipe not found.", "danger");
            return;
        }
        const yardId = Number(this.state.moveForm.toYard);
        const binId = Number(this.state.moveForm.toBin);
        const plateId = Number(this.state.moveForm.toPlate);
        const qty = Number(this.state.moveForm.qty);
        if (!yardId || !binId || !plateId) {
            this.notify("Select a valid To Yard / Bin / Plate.", "danger");
            return;
        }
        if (!qty || qty <= 0) {
            this.notify("Quantity must be greater than zero.", "danger");
            return;
        }
        this.state.moveBusy = true;
        try {
            const result = await this.orm.call("stock.picking", "yms_move_pipe_ui", [
                row.lot_id,
                yardId,
                binId,
                plateId,
                qty,
                row.location_id || false,
                this.state.moveForm.reason || false,
            ]);
            this.applyMovementScreen({
                pipes: result.pipes || [],
                yards: this.state.moveYards,
                bins: this.state.moveBins,
                plates: this.state.movePlates,
                movements: result.movements || [],
                kpi: result.kpi || this.state.moveKpiData,
                yard_board: result.yard_board || this.state.moveYardBoard,
            });
            this.state.selectedMoveId = result.picking_id;
            this.state.moveFormOpen = false;
            this.notify(`Movement completed${result.picking_name ? ` (${result.picking_name})` : ""}.`);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        } finally {
            this.state.moveBusy = false;
        }
    }

    applyVerificationScreen(result) {
        this.state.verifyRows = result.rows || [];
        this.state.verifyTree = result.tree || [];
        this.state.verifyHistory = result.history || [];
        this.state.verifyDisc = result.discrepancies || [];
        this.state.verifyYards = result.yards || [];
        this.state.verifyBinList = result.bins || [];
        this.state.verifyPlateList = result.plates || [];
        this.state.verifyProducts = result.products || [];
        const keep = this.state.verifyRows.find((p) => p.lot_id === this.state.verifyLotId);
        const first = keep || this.verifyPipes[0] || this.state.verifyRows[0];
        if (first) {
            this.selectVerifyRow(first);
        } else {
            this.state.verifyLotId = false;
            this.state.verifyPipeId = "";
        }
    }

    selectVerifyRow(row) {
        if (!row) {
            return;
        }
        this.state.verifyLotId = row.lot_id;
        this.state.verifyPipeId = row.id;
        this.state.physicalQty = row.physical_qty != null ? row.physical_qty : row.qty;
        this.state.remarks = row.verify_remarks || "";
        this.state.physicalStatus = Number(this.state.physicalQty) <= 0 ? "Missing" : "Found";
    }

    onPhysicalStatusChange() {
        if (this.state.physicalStatus === "Missing") {
            this.state.physicalQty = 0;
        } else if (Number(this.state.physicalQty) <= 0) {
            this.state.physicalQty = this.selectedVerify.qty || 1;
        }
    }

    resetVerifyEntry() {
        const row = this.selectedVerify;
        this.state.physicalQty = row.qty || 0;
        this.state.remarks = "";
        this.state.physicalStatus = "Found";
    }

    clearVerifyFilters() {
        this.state.verifyYard = "all";
        this.state.verifyBin = "all";
        this.state.verifyPlate = "all";
        this.state.verifyProductId = "all";
        this.state.verifyVStatus = "pending";
        this.state.verifyLocId = 0;
        this.state.verifyLocQuery = "";
        this.state.verifyScan = "";
        this.loadVerification();
    }

    selectVerifyLocation(node) {
        this.state.verifyLocId = node && node.id ? node.id : 0;
        this.loadVerification();
    }

    async loadVerification() {
        try {
            const result = await this.orm.call("stock.lot", "yms_get_verification_screen", [], {
                loc_id: this.state.verifyLocId || 0,
                yard: this.state.verifyYard,
                bin_name: this.state.verifyBin,
                plate_name: this.state.verifyPlate,
                product_id: this.state.verifyProductId === "all" ? 0 : Number(this.state.verifyProductId),
            });
            this.applyVerificationScreen(result);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        }
    }

    async confirmVerification() {
        if (this.state.verifyBusy) {
            return;
        }
        const row = this.selectedVerify;
        if (!row.lot_id) {
            this.notify("Pipe not found.", "danger");
            return;
        }
        this.state.verifyBusy = true;
        try {
            const result = await this.orm.call("stock.lot", "yms_save_verification_ui", [
                row.lot_id,
                Number(this.state.physicalQty),
                this.state.remarks || false,
                this.state.verifyLocId || 0,
            ]);
            this.applyVerificationScreen(result.screen || {});
            const sign = result.variance > 0 ? "+" : "";
            this.notify(`Verification ${result.status}. Variance ${sign}${result.variance}. Stock quantity unchanged.`);
            const updated = this.state.verifyRows.find((p) => p.lot_id === row.lot_id);
            if (updated) {
                this.selectVerifyRow(updated);
            }
        } catch (error) {
            this.notify(this._rpcErrorMessage(error), "danger");
        } finally {
            this.state.verifyBusy = false;
        }
    }

    _pickStatusUi(state) {
        if (state === "done") {
            return "Completed";
        }
        if (state === "reserved") {
            return "In Progress";
        }
        return "Pending";
    }

    _mapPickRow(rec) {
        return {
            id: rec.name || String(rec.id),
            pickDbId: rec.id,
            order: rec.origin || rec.picking || rec.name,
            type: "Inventory Retrieval",
            pipe: rec.pipe_id || "",
            spec: rec.product || "",
            source: rec.location || "",
            dest: rec.dest || "",
            qty: rec.qty,
            picked: rec.state === "done" ? rec.qty : 0,
            status: this._pickStatusUi(rec.state),
            statusKey: rec.state,
            priority: rec.state === "done" ? "Low" : rec.state === "reserved" ? "High" : "Medium",
            assignee: rec.user || "",
            date: "",
            yard: rec.yard || "",
            bin: rec.bin || "",
            plate: rec.plate || "",
            quality: "",
            lot_id: rec.lot_id,
            picking: rec.picking || "",
        };
    }

    _histUiType(type) {
        const t = String(type || "").toLowerCase();
        if (t.includes("put")) {
            return "Put-away";
        }
        if (t.includes("retriev") || t.includes("pick")) {
            return "Picking";
        }
        if (t.includes("outgoing") || t.includes("delivery") || t.includes("outbound")) {
            return "Outbound";
        }
        if (t.includes("adjust")) {
            return "Adjustment";
        }
        return "Internal Move";
    }

    _histKind(uiType) {
        if (uiType === "Put-away") {
            return "pa";
        }
        if (uiType === "Picking" || uiType === "Outbound") {
            return "pk";
        }
        return "im";
    }

    _mapHistRow(row) {
        const uiType = this._histUiType(row.type);
        const date = String(row.date || "");
        const parts = date.split(" ");
        return {
            move_line_id: row.move_line_id,
            pipe: row.pipe_id || "",
            doc: row.document || "",
            type: uiType,
            kind: this._histKind(uiType),
            dt: parts[0] || date,
            time: parts[1] || "",
            from: row.from_location || "",
            fromLine: row.from_location || "",
            to: row.to_location || "",
            toShow: row.to_location || "",
            toLine: row.to_location || "",
            qty: row.qty,
            user: row.user || "",
            device: "Odoo",
            remarks: row.origin || "",
            scanSrc: "Inventory",
            scanTime: date,
            scanDev: "Odoo",
            status: row.state === "done" ? "Completed" : (row.state || ""),
        };
    }

    applyPicks(rows) {
        this.state.pickRows = (rows || []).map((r) => this._mapPickRow(r));
        if (!this.state.pickId && this.state.pickRows.length) {
            this.selectPickRow(this.state.pickRows[0]);
        }
    }

    async loadPicking() {
        try {
            const rows = await this.orm.call("yms.stock.pick", "yms_get_picks", []);
            this.applyPicks(rows);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not load picking tasks."), "danger");
            this.state.pickRows = [];
        }
    }

    async loadAvailability() {
        const productId = Number(this.state.pickProductId || this.state.recvProductId);
        if (!productId) {
            this.state.availInfo = {
                product_id: false,
                product: "",
                required_qty: Number(this.state.pickQty) || 0,
                available_qty: 0,
                reserved_qty: 0,
                shortage_qty: 0,
                sufficient: true,
                pipes: [],
                locations: [],
            };
            return;
        }
        try {
            const data = await this.orm.call(
                "product.product",
                "yms_get_material_availability",
                [productId, Number(this.state.pickQty) || 0]
            );
            this.state.availInfo = data || this.state.availInfo;
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not load availability."), "danger");
        }
    }

    _resolvePickLotId() {
        const scan = (this.state.pickScan || "").trim();
        if (!scan) {
            return false;
        }
        const fromAvail = (this.state.availInfo.pipes || []).find(
            (p) => String(p.pipe_id || "").toLowerCase() === scan.toLowerCase()
        );
        if (fromAvail) {
            return fromAvail.lot_id;
        }
        const fromTask = this.state.pickRows.find((t) => t.pipe === scan);
        return fromTask && fromTask.lot_id ? fromTask.lot_id : false;
    }

    async completeOrCreatePick(complete) {
        if (this.state.pickBusy) {
            return;
        }
        const task = this.selectedTask;
        if (task.pickDbId && (task.statusKey === "draft" || task.statusKey === "reserved") && complete) {
            this.state.pickBusy = true;
            try {
                await this.orm.call("yms.stock.pick", "yms_complete", [[task.pickDbId]]);
                this.notify(`Pick ${task.id} completed.`);
                await this.loadPicking();
                await this.loadAvailability();
            } catch (error) {
                this.notify(this._rpcErrorMessage(error, "Picking failed."), "danger");
            } finally {
                this.state.pickBusy = false;
            }
            return;
        }
        const productId = Number(this.state.pickProductId || this.state.recvProductId);
        const qty = Number(this.state.pickQty);
        if (!productId) {
            this.notify("Select a product.", "danger");
            return;
        }
        if (!qty) {
            this.notify("Enter quantity to pick.", "danger");
            return;
        }
        this.state.pickBusy = true;
        try {
            const lotId = this._resolvePickLotId();
            const result = await this.orm.call("yms.stock.pick", "yms_create_pick_ui", [
                productId,
                qty,
                lotId || false,
                this.state.pickOrigin || this.state.recvOrigin || false,
                complete,
            ]);
            this.applyPicks(result.picks || []);
            this.state.pickId = result.name || this.state.pickId;
            this.notify(complete ? `Pick ${result.name} completed.` : `Pick ${result.name} reserved.`);
            await this.loadAvailability();
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Picking failed."), "danger");
        } finally {
            this.state.pickBusy = false;
        }
    }

    createPickTask() {
        return this.completeOrCreatePick(false);
    }

    async cancelPick() {
        const task = this.selectedTask;
        if (!task.pickDbId) {
            this.notify("Select a picking task.", "danger");
            return;
        }
        if (this.state.pickBusy) {
            return;
        }
        this.state.pickBusy = true;
        try {
            await this.orm.call("yms.stock.pick", "yms_cancel", [[task.pickDbId]]);
            this.notify(`Pick ${task.id} cancelled.`);
            await this.loadPicking();
            await this.loadAvailability();
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Cancel failed."), "danger");
        } finally {
            this.state.pickBusy = false;
        }
    }

    async loadHistory() {
        this.state.histBusy = true;
        try {
            const pipe = (this.state.histPipe || "").trim();
            const kwargs = pipe ? { pipe_name: pipe } : {};
            const rows = await this.orm.call("stock.picking", "yms_get_traceability", [], kwargs);
            this.state.histRows = (rows || []).map((r) => this._mapHistRow(r));
            if (this.state.histRows.length && !this.state.histRows.find((h) => h.doc === this.state.histDoc)) {
                this.state.histDoc = this.state.histRows[0].doc;
            }
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not load movement history."), "danger");
            this.state.histRows = [];
        } finally {
            this.state.histBusy = false;
        }
    }

    async loadReports() {
        this.state.reportBusy = true;
        try {
            const data = await this.orm.call("stock.lot", "yms_get_inventory_reports", []);
            this.state.reportData = data || {};
            const hist = await this.orm.call("stock.picking", "yms_get_traceability", []);
            this.state.reportMovesLive = (hist || []).slice(0, 8).map((r) => {
                const mapped = this._mapHistRow(r);
                return {
                    dt: `${mapped.dt} ${mapped.time}`.trim(),
                    pipe: mapped.pipe,
                    type: mapped.type,
                    kind: mapped.kind,
                    from: mapped.from,
                    to: mapped.to,
                    user: mapped.user,
                    move_line_id: mapped.move_line_id,
                };
            });
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not load reports."), "danger");
            this.state.reportData = {};
            this.state.reportMovesLive = [];
        } finally {
            this.state.reportBusy = false;
        }
    }

    exportInventoryCsv() {
        const rows = [["Pipe ID", "Material", "Qty", "Status", "Quality", "Yard", "Bin", "Plate"]];
        for (const p of this.state.invStock || []) {
            rows.push([p.id, p.material, p.qty, p.status, p.quality, p.yard, p.bin, p.plate]);
        }
        this._downloadCsv("inventory.csv", rows);
        this.notify("Inventory CSV downloaded.");
    }

    exportReportCsv() {
        const kpi = (this.state.reportData && this.state.reportData.inventory_summary) || {};
        const rows = [["Metric", "Value"], ["Total", kpi.total || 0], ["Provisional", kpi.provisional || 0], ["Located", kpi.located || 0], ["Available", kpi.available || 0]];
        this._downloadCsv("inventory_report.csv", rows);
        this.notify("Report CSV downloaded.");
    }

    exportHistoryCsv() {
        const rows = [["Date", "Pipe", "Type", "From", "To", "Qty", "Document"]];
        for (const r of this.state.histRows || []) {
            rows.push([r.dt, r.pipe, r.type, r.from, r.to, r.qty, r.doc]);
        }
        this._downloadCsv("movement_history.csv", rows);
        this.notify("History CSV downloaded.");
    }

    _downloadCsv(filename, rows) {
        const text = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        this._downloadText(filename, text);
    }

    _downloadText(filename, text) {
        const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    _resetGrnArrival() {
        this.state.grnArrival = { datetime: "", truck: "", transporter: "", reference: "", notes: "" };
    }

    _grnArrivalFromPo(rec) {
        const arrival = (rec && rec.arrival) || {};
        let datetime = arrival.datetime || "";
        if (datetime) {
            datetime = String(datetime).replace(" ", "T").slice(0, 16);
        }
        return {
            datetime,
            truck: arrival.truck || "",
            transporter: arrival.transporter || "",
            reference: arrival.reference || "",
            notes: arrival.notes || "",
        };
    }

    selectGrnPo(po) {
        if (this.state.selectedPo !== po) {
            this.state.provisionalCreated = false;
            this.state.invoiceRefStatus = "Pending";
            this.state.grnNo = "—";
            this.state.grnDraft = "Ready to Confirm";
        }
        this.state.selectedPo = po;
        this.state.recvOrigin = po || "";
        const rec = (this.state.inboundPos || []).find((p) => p.po === po);
        this.state.inboundPoId = rec ? rec.id : false;
        this.state.grnArrival = this._grnArrivalFromPo(rec);
        const pipes = [];
        for (const mat of (rec && rec.materials) || []) {
            if (mat.pipe_id) {
                pipes.push(mat);
            }
        }
        if (pipes.length) {
            this.state.recvLines = pipes.map((mat) => {
                const line = this._emptyRecvLine();
                line.id = mat.pipe_id;
                line.barcode = mat.pipe_id;
                line.material = mat.description || mat.code || "";
                line.spec = mat.spec || mat.specification || "—";
                line.length = mat.length || "—";
                line.diameter = mat.diameter || "—";
                line.grade = mat.grade || "—";
                line.batch = mat.batch || "—";
                line.expected = Number(mat.ordered || 1);
                line.received = Number(mat.ordered || 1);
                line.variance = line.received - line.expected;
                return line;
            });
            const code = pipes[0].code;
            const product = (this.state.recvProducts || []).find((p) => (p.default_code || p.display_name || "").includes(code));
            if (product) {
                this.state.recvProductId = String(product.id);
            } else {
                const pipe24 = (this.state.recvProducts || []).find((p) => (p.default_code || "") === "PIPE-24");
                if (pipe24) {
                    this.state.recvProductId = String(pipe24.id);
                }
            }
        }
    }

    clearGrnPo() {
        this.state.selectedPo = "";
        this.state.inboundPoId = false;
        this.state.grnPoQuery = "";
        this.state.grnPoStatus = "all";
        this._resetGrnArrival();
    }

    toggleGrnFilter() {
        this.state.grnShowFilter = !this.state.grnShowFilter;
    }

    async loadInboundPos() {
        try {
            const rows = await this.orm.call("yms.inbound.po", "yms_get_inbound_pos", ["", "all"]);
            this.state.inboundPos = rows || [];
            const hist = await this.orm.call("yms.inbound.po", "yms_get_import_history", []);
            this.state.importHistory = hist || [];
            if (hist && hist[0] && hist[0].time) {
                this.state.inboundLastSync = hist[0].time;
            }
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not load inbound PO references."), "danger");
            this.state.inboundPos = [];
        }
    }

    async loadYardPlans() {
        try {
            const rows = await this.orm.call("yms.yard.plan", "yms_get_yard_plans", []);
            this.state.yardPlans = rows || [];
            const hist = await this.orm.call("yms.yard.plan", "yms_get_yard_import_history", []);
            this.state.yardHistory = hist || [];
            if (hist && hist[0] && hist[0].time) {
                this.state.yardLastSync = hist[0].time;
            }
        } catch (error) {
            this.state.yardPlans = [];
        }
    }

    async loadDashboard() {
        try {
            const data = await this.orm.call("stock.lot", "yms_get_inventory_reports", []);
            const kpi = data.inventory_summary || {};
            const quality = data.quality_status || {};
            const yards = (data.stock_by_yard || []).map((y) => ({
                ...y,
                height: `${Math.min(100, Math.max(8, Number(y.qty || 0) * 12))}%`,
            }));
            const histRaw = await this.orm.call("stock.picking", "yms_get_traceability", []);
            const hist = Array.isArray(histRaw) ? histRaw : [];
            const seenPipes = new Set();
            const moves = [];
            for (const row of hist || []) {
                const mapped = this._mapHistRow(row);
                const pipe = mapped.pipe || "";
                if (pipe && seenPipes.has(pipe)) {
                    continue;
                }
                if (pipe) {
                    seenPipes.add(pipe);
                }
                moves.push(mapped);
                if (moves.length >= 8) {
                    break;
                }
            }
            const hold = quality.hold || 0;
            const failed = quality.failed || 0;
            const total = kpi.total || 0;
            let pickings = [];
            if (total) {
                const pickingsRaw = await this.orm.searchRead(
                    "stock.picking",
                    [["state", "=", "done"], ["picking_type_code", "=", "incoming"]],
                    ["name", "origin", "scheduled_date", "partner_id"],
                    { limit: 8, order: "id desc" }
                );
                pickings = Array.isArray(pickingsRaw) ? pickingsRaw : [];
            }
            this.state.dashLive = {
                date: new Date().toLocaleDateString(),
                kpis: [
                    { key: "total", label: "Total Inventory", value: String(total), unit: "Pipes", icon: "fa-cubes", tone: "purple", screen: "inventory" },
                    { key: "available", label: "Available", value: String(kpi.available || 0), unit: "Pipes", icon: "fa-check", tone: "green", screen: "inventory" },
                    { key: "provisional", label: "Provisional", value: String((data.provisional && data.provisional.qty) || kpi.provisional || 0), unit: "Pending", icon: "fa-clock-o", tone: "yellow", screen: "grn" },
                    { key: "located", label: "Located", value: String((data.located && data.located.qty) || kpi.located || 0), unit: "On plate", icon: "fa-map-marker", tone: "blue", screen: "inventory" },
                    { key: "hold", label: "Quality Hold", value: String(hold), unit: "Pipes", icon: "fa-pause", tone: "yellow", screen: "grn" },
                    { key: "moves", label: "Movements", value: String((data.pipe_movement && (data.pipe_movement.total || data.pipe_movement.count)) || moves.length), unit: "Records", icon: "fa-exchange", tone: "violet", screen: "history" },
                ],
                status: [
                    { label: "Available", value: String(kpi.available || 0), pct: total ? `${Math.round(((kpi.available || 0) / total) * 100)}%` : "0%", color: "#22c55e" },
                    { label: "Provisional", value: String(kpi.provisional || 0), pct: total ? `${Math.round(((kpi.provisional || 0) / total) * 100)}%` : "0%", color: "#eab308" },
                    { label: "Hold", value: String(hold), pct: total ? `${Math.round((hold / total) * 100)}%` : "0%", color: "#f59e0b" },
                    { label: "Failed", value: String(failed), pct: total ? `${Math.round((failed / total) * 100)}%` : "0%", color: "#ef4444" },
                ],
                yards,
                grns: pickings.map((p) => ({
                    no: p.name,
                    po: p.origin || "—",
                    supplier: Array.isArray(p.partner_id) ? p.partner_id[1] : "—",
                    qty: "",
                    status: "Done",
                    date: p.scheduled_date || "",
                })),
                movements: moves.map((m, idx) => ({
                    pipe: m.pipe,
                    from: m.from,
                    to: m.to,
                    time: m.time,
                    rowKey: `mv-${idx}-${m.move_line_id || m.pipe || ""}`,
                })),
                alerts: hold || failed
                    ? [{ text: `${hold} hold / ${failed} failed quality on stock`, time: "now", tone: "yellow" }]
                    : [{ text: "No quality exceptions in current YMS stock.", time: "now", tone: "blue" }],
            };
            this.loadInventory();
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not load dashboard."), "danger");
        }
    }

    cfgShow(section) {
        const tab = this.state.configTab || "general";
        if (tab === "general") {
            return ["company", "params", "structure", "users", "devices", "integrations", "notifications"].includes(section);
        }
        return tab === section;
    }

    switchClass(on) {
        return on ? "o_yms__switch is-on" : "o_yms__switch";
    }

    async loadConfig() {
        try {
            const data = await this.orm.call("stock.location", "yms_get_settings", []);
            this._applySettings(data);
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not load settings."), "danger");
        }
    }

    _applySettings(data) {
        const src = data || {};
        Object.assign(this.state.settings, src);
        this.state.configCompany = src.company_name || "";
        this.state.configWarehouse = src.warehouse || "";
        this.state.configLocations = src.yard_structure || [];
        this.state.configUsers = src.users || [];
    }

    async saveSettings(extra) {
        if (this.state.configBusy) {
            return;
        }
        this.state.configBusy = true;
        try {
            const payload = {
                company_name: this.state.settings.company_name,
                plant: this.state.settings.plant,
                timezone: this.state.settings.timezone,
                date_format: this.state.settings.date_format,
                uom: this.state.settings.uom,
                default_yard: this.state.settings.default_yard,
                auto_pipe_id: this.state.settings.auto_pipe_id,
                require_qc: this.state.settings.require_qc,
                allow_manual_adjust: this.state.settings.allow_manual_adjust,
                movement_approval: this.state.settings.movement_approval,
                default_pipe_status: this.state.settings.default_pipe_status,
                history_months: this.state.settings.history_months,
                devices: this._arr(this.state.settings.devices),
                integrations: this._arr(this.state.settings.integrations),
                notifications: this._arr(this.state.settings.notifications),
                ...(extra || {}),
            };
            const data = await this.orm.call("stock.location", "yms_save_settings", [payload]);
            this._applySettings(data);
            this.state.configEditCompany = false;
            this.notify("Settings saved.");
        } catch (error) {
            this.notify(this._rpcErrorMessage(error, "Could not save settings."), "danger");
        } finally {
            this.state.configBusy = false;
        }
    }

    async toggleSetting(key) {
        this.state.settings[key] = !this.state.settings[key];
        await this.saveSettings();
    }

    async toggleNotifyRow(row) {
        row.status = row.status === "Enabled" ? "Disabled" : "Enabled";
        await this.saveSettings();
    }

    async addConfigDevice() {
        const name = window.prompt("Device name", "Scanner-0" + (this.state.settings.devices.length + 1));
        if (!name) {
            return;
        }
        this.state.settings.devices = [
            ...this._arr(this.state.settings.devices),
            { name, type: "Barcode Scanner", location: this.state.settings.default_yard || "Yard-01", status: "Online" },
        ];
        await this.saveSettings();
    }

    async addConfigIntegration() {
        const name = window.prompt("System name", "New System");
        if (!name) {
            return;
        }
        this.state.settings.integrations = [
            ...this._arr(this.state.settings.integrations),
            { system: name, type: "API", status: "Not Configured" },
        ];
        await this.saveSettings();
    }

    async setIntegrationStatus(row, status) {
        row.status = status;
        await this.saveSettings();
    }

    async setDeviceStatus(row, status) {
        row.status = status;
        await this.saveSettings();
    }

    goDashKpi(kpi) {
        if (kpi && kpi.screen) {
            this.go(kpi.screen);
        }
    }
}

registry.category("actions").add("yms_inventory_app", YmsInventoryApp);
