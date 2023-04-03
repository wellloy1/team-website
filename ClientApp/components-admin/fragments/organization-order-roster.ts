import { FragmentBase, FragmentDynamic } from './fragment-base'
import { AdminOrderRoster } from './order-roster'


@FragmentDynamic
class AdminOrganizationOrderRoster extends AdminOrderRoster
{
    static get is() { return 'tmladmin-organization-order-roster' }

    isOrganization = true

    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        return super._computeAPIUrl(websiteUrl, '/admin/api/order/partner-order-rosteritems-', api_action)
    }
}
