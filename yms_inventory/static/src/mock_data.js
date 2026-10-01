/** @odoo-module **/

export const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "fa-home" },
    { id: "po_import", label: "PO Import", icon: "fa-file-text-o" },
    { id: "grn", label: "GRN / Receiving", icon: "fa-truck" },
    { id: "yard_import", label: "Yard Data", icon: "fa-map-marker" },
    { id: "inventory", label: "Inventory & Location", icon: "fa-cube" },
    { id: "movement", label: "Pipe Movement", icon: "fa-exchange" },
    { id: "picking", label: "Picking / Retrieval", icon: "fa-shopping-cart" },
    { id: "history", label: "Movement History", icon: "fa-history" },
    { id: "reports", label: "Reports", icon: "fa-bar-chart" },
    { id: "config", label: "Configuration", icon: "fa-cog" },
];

export const GRN_STEPS = [
    { id: 1, label: "PO & Arrival" },
    { id: 2, label: "Receiving & Verify" },
    { id: 3, label: "Quality Check" },
    { id: 4, label: "Put-away / Location" },
    { id: 5, label: "Review & Confirm" },
];
