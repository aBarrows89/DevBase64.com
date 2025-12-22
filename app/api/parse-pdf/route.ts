import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await extractText(arrayBuffer);

    // Handle different return formats from unpdf
    let text: string;
    if (typeof result === 'string') {
      text = result;
    } else if (result && typeof result.text === 'string') {
      text = result.text;
    } else if (result && Array.isArray(result.text)) {
      text = result.text.join('\n');
    } else if (result && result.totalPages) {
      // If it returns page data, extract text from each page
      text = JSON.stringify(result);
    } else {
      text = String(result || '');
    }

    console.log('PDF parsed, text length:', text.length);
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}
