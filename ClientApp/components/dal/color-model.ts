export class ColorModel
{
    i: string | null = "" //id Palette
    n: string | null = "" //name
    h: string | null = "" //RGB hex

    constructor({ i = "", n = "", h = "" } = {})
    {
        this.i = i
        this.n = n
        this.h = h
    }
}
