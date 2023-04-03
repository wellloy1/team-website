import { FragmentBase, FragmentDynamic } from './fragment-base'
import { AdminCustomStore } from './custom-store'


@FragmentDynamic
class AdminOrganizationCustomStore extends AdminCustomStore
{
    static get is() { return 'tmladmin-organization-custom-store' }

    isOrganization = true
}
