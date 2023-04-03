export class Matrix
{

	context: any
	_t: (b, d, f, h, j, l) => Matrix
	a: number = 0
	b: number = 0
	c: number = 0
	d: number = 0
	e: number = 0
	f: number = 0


	constructor(a?)
	{
		var b = this
		this._t = this.transform
		b.a = b.d = 1
		b.b = b.c = b.e = b.f = 0
		if (a)
		{
			(b.context = a).setTransform(1, 0, 0, 1, 0, 0)
		}
	}

	transform (b, d, f, h, j, l)
	{
		let m : Matrix = this
		let a = m.a
		let c = m.b
		let e = m.c
		let g = m.d
		let i = m.e
		let k = m.f
		m.a = a * b + e * d
		m.b = c * b + g * d
		m.c = a * f + e * h
		m.d = c * f + g * h
		m.e = a * j + e * l + i
		m.f = c * j + g * l + k
		return m._x()
	}

	rotate (a:number)
	{
		let b = Math.cos(a)
		let c = Math.sin(a)
		return this._t(b, c, -c, b, 0, 0)
	}

	fromTriangles(j, k, a)
	{
		var b = new Matrix(),
			c = new Matrix(a),
			d, e, f, h, g, i
		if (Array.isArray(j))
		{
			if (typeof j[0] === "number")
			{
				f = j[4]
				h = j[5]
				g = k[4]
				i = k[5]
				d = [j[0] - f, j[1] - h, j[2] - f, j[3] - h, f, h]
				e = [k[0] - g, k[1] - i, k[2] - g, k[3] - i, g, i]
			} else
			{
				f = j[2].x
				h = j[2].y
				g = k[2].x
				i = k[2].y
				d = [j[0].x - f, j[0].y - h, j[1].x - f, j[1].y - h, f, h]
				e = [k[0].x - g, k[0].y - i, k[1].x - g, j[1].y - i, g, i]
			}
		} else
		{
			d = [j.px - j.rx, j.py - j.ry, j.qx - j.rx, j.qy - j.ry, j.rx, j.ry]
			e = [k.px - k.rx, k.py - k.ry, k.qx - k.rx, k.qy - k.ry, k.rx, k.ry]
		}
		b.setTransform.apply(b, d)
		c.setTransform.apply(c, e)
		return c.multiply(b.inverse())
	}
	
	fromSVGMatrix(b, a)
	{
		console.warn("Obsolete. Use Matrix.from()")
		return new Matrix(a).multiply(b)
	}

	fromDOMMatrix(b, a)
	{
		console.warn("Obsolete. Use Matrix.from()")
		if (!b.is2D)
		{
			throw "Cannot use 3D matrix."
		}
		return new Matrix(a).multiply(b)
	}
	
	fromSVGTransformList(d, a)
	{
		var c = new Matrix(a),
			b = 0
		while (b < d.length)
		{
			c.multiply(d[b++].matrix)
		}
		return c
	}

	from(g, h, i, k, l, n, j)
	{
		var o = new Matrix(j)
		if (typeof g === "number")
		{
			o.setTransform(g, h, i, k, l, n)
		} else
		{
			if (typeof g.is2D === "boolean" && !g.is2D)
			{
				throw "Cannot use 3D DOMMatrix."
			}
			if (h)
			{
				o.context = h
			}
			o.multiply(g)
		}
		return o
	}



	_q(a, b)
	{
		return Math.abs(a - b) < 1e-14
	}

	_x()
	{
		var a = this
		if (a.context)
		{
			a.context.setTransform(a.a, a.b, a.c, a.d, a.e, a.f)
		}
		return a
	}

	concat(a)
    {
		return this.clone().multiply(a)
	}

	scale(a, b)
	{
		return this._t(a, 0, 0, b, 0, 0)
	}

	setTransform(g, h, i, j, k, l)
	{
		var m = this
		m.a = g
		m.b = h
		m.c = i
		m.d = j
		m.e = k
		m.f = l
		return m._x()
	}

	translate(a, b)
	{
		return this._t(1, 0, 0, 1, a, b)
	}

	multiply(a)
	{
		return this._t(a.a, a.b, a.c, a.d, a.e, a.f)
	}

	inverse(a?)
	{
		var d = this,
			c = new Matrix(a ? d.context : null),
			b = d.determinant()
		if (d._q(b, 0))
		{
			throw "Matrix not invertible."
		}
		c.a = d.d / b
		c.b = -d.b / b
		c.c = -d.c / b
		c.d = d.a / b
		c.e = (d.c * d.f - d.d * d.e) / b
		c.f = -(d.a * d.f - d.b * d.e) / b
		return c
	}

	determinant()
	{
		return this.a * this.d - this.b * this.c
	}

	clone(a?)
	{
		return new Matrix(a ? null : this.context).multiply(this)
	}

	applyToPoint (b, c)
	{
		let a = this
		return {
			x: b * a.a + c * a.c + a.e,
			y: b * a.b + c * a.d + a.f
		}
	}

	applyToArray (e)
	{
		let a = 0
		let d, b 
		let c: any[] = []
		if (typeof e[0] === "number")
		{
			b = e.length
			while (a < b)
			{
				d = this.applyToPoint(e[a++], e[a++])
				c.push(d.x, d.y)
			}
		} else
		{
			while (d = e[a++])
			{
				c.push(this.applyToPoint(d.x, d.y))
			}
		}
		return c
	}
}
