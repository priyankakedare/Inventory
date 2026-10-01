# -*- coding: utf-8 -*-


def post_init_hook(env):
    """Enable lots/serials and storage locations so YMS can use stock.lot and nested locations."""
    _enable_yms_stock_features(env)


def _enable_yms_stock_features(env):
    user_group = env.ref("base.group_user")
    for xmlid in ("stock.group_production_lot", "stock.group_stock_multi_locations"):
        group = env.ref(xmlid)
        if group not in user_group.implied_ids:
            user_group.write({"implied_ids": [(4, group.id)]})
