import { NextResponse } from 'next/server';
import Product from '@/lib/models/Product';
import dbConnect from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find({}).lean().exec();
    
    const serializedProducts = products.map(product => ({
      ...product,
      _id: product._id.toString(),
      createdAt: product.createdAt.toISOString(),
    }));

    return NextResponse.json(serializedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error fetching products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  await dbConnect();

  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const imageFile = formData.get('image') as File;

    if (!name || !description || !price || !imageFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle file upload
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(imageFile.name);
    const filename = `product-${timestamp}${ext}`;
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);

    // Write file to filesystem
    await writeFile(uploadPath, buffer);

    // Create product in database
    const product = new Product({
      name,
      description,
      price,
      image: `/uploads/${filename}`,
    });

    await product.save();

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Error creating product' },
      { status: 500 }
    );
  }
}