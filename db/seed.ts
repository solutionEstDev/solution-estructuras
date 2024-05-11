import { db, Products, Categories, User } from 'astro:db'
import { Argon2id } from 'oslo/password'

interface Category {
	id: number
	name: string
}

interface Product{
	id: number
	name: string
	shortName: string
	price: number
	description: string
	imageUrl: string | null
	imageUrl2: string | null
	imageUrl3: string | null
	imageAlt: string | null
	categoryId: number
	showAtHome: boolean
}

const getCategories = async () => {
  const res = await fetch('https://dummyjson.com/products/categories')
  const data = await res.json()
  const categoriesJson : Category[] = data.slice(0, 5).map((category : string, index : number) => {
    return {
      id: index,
      name: category
    }
  }
  )
  return categoriesJson
}

const products = async ({ categories } : { categories : Category[]}) => {
  const products = await Promise.all(
    categories.map(async (category) => {
      const res = await fetch(`https://dummyjson.com/products/category/${category.name}`)
      const { products: productsRes } = await res.json()

      const fixImageUrl = (url : null | string) => {
        // algunas url estan mal, ejemplo src="["https://i.imgur.com/w3Y8NwQ.jpeg"]"

        if (url && url.includes('["')) {
          const fixedUrl = url.replace('["', '').replace('"]', '')
          return fixedUrl
        }

        return url
      }

      const productsJson = productsRes.map((product : any) => {
        return {
          id: product.id,
          name: product.title,
          shortName: product.title.split(' ')[0],
          price: product.price,
          description: product.description,
          imageUrl: fixImageUrl(product.thumbnail) || null,
          imageUrl2: fixImageUrl(product.images[0]) || null,
          imageUrl3: fixImageUrl(product.images[1]) || null,
          imageAlt: fixImageUrl(product.images[2]) || null,
          categoryId: category.id,
          showAtHome: false
        }
      }
      )
      return productsJson
    }
    )
  )

  const productsArray = products.flat()

  return productsArray
}

export default async function () {
  const hashedPassword = await new Argon2id().hash('admin')

  await db.insert(User).values([
    {
      id: '1',
      username: 'admin',
      password: hashedPassword
    }
  ])

  const categories : Category[] = await getCategories()
  const productsArray = await products({ categories })
  // make  5 random products show at home true

  const randomProductsIndex: number[] = []

  while (randomProductsIndex.length < 5) {
    const randomIndex = Math.floor(Math.random() * productsArray.length)
    if (!randomProductsIndex.includes(randomIndex)) {
      randomProductsIndex.push(randomIndex)
    }
  }

  randomProductsIndex.forEach((index) => {
    productsArray[index].showAtHome = true
  })

  await db.insert(Categories).values(
    categories
  )

  await db.insert(Products).values(
    productsArray
  )

  console.log('Seed data inserted')
}