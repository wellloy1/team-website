import { FragmentBase, FragmentDynamic } from './fragment-base'
import { AdminBrand } from './brand'


@FragmentDynamic
class AdminManufacturerBrand extends AdminBrand
{
    static get is() { return 'tmladmin-manufacturer-brand' }

    isManufacturer = true

    _computeAPIUrl(websiteUrl, APIPath, api_action)
    {
        return super._computeAPIUrl(websiteUrl, '/admin/api/brand/manufacturer-brand-', api_action)
    }
}
