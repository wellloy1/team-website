import { FragmentBase, FragmentDynamic } from './fragment-base'
import { AdminOrder } from './order'


@FragmentDynamic
class AdminOrganizationOrder extends AdminOrder
{
    static get is() { return 'tmladmin-organization-order' }

    isOrganization = true

    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        return super._computeAPIUrl(websiteUrl, '/admin/api/order/partner-order-', api_action)
    }
}
