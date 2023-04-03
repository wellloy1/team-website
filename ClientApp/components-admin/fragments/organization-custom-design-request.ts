import { FragmentBase, FragmentDynamic } from './fragment-base'
import { AdminCustomDesignRequest } from './custom-design-request'


@FragmentDynamic
class AdminOrganizationCustomDesignRequest extends AdminCustomDesignRequest
{
    static get is() { return 'tmladmin-organization-custom-design-request' }

    isOrganization = true

    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        return super._computeAPIUrl(websiteUrl, '/admin/api/customdesignrequest/partner-request-', api_action)
    }
}
