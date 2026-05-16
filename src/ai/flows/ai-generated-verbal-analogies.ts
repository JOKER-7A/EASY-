'use server';
/**
 * @fileOverview A Genkit flow for generating verbal analogy questions.
 *
 * - generateVerbalAnalogy - A function that handles the verbal analogy generation process.
 * - GenerateVerbalAnalogyInput - The input type for the generateVerbalAnalogy function.
 * - GenerateVerbalAnalogyOutput - The return type for the generateVerbalAnalogy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVerbalAnalogyInputSchema = z.object({
  difficulty: z
    .enum(['سهل', 'متوسط', 'صعب'])
    .describe('The desired difficulty level for the analogy question (سهل, متوسط, صعب).'),
  category: z
    .enum([
      'ترادف وتضاد', // Synonym/Antonym
      'جزء من كل', // Part-Whole
      'علاقة سببية', // Cause-Effect
      'تصنيف', // Classification
      'تلازم', // Co-occurrence
      'أداة واستخدامها', // Tool and its Use
      'فعل ومفعول به', // Verb and object
      'فاعل وفعله', // Agent and its action
      'مكان وزمان', // Place and time
      'صفة وموصوف' // Adjective and noun
    ])
    .describe('The category or type of relationship for the analogy question.'),
});
export type GenerateVerbalAnalogyInput = z.infer<typeof GenerateVerbalAnalogyInputSchema>;

const GenerateVerbalAnalogyOutputSchema = z.object({
  question: z.string().describe('The verbal analogy question in the format "TERM1 : TERM2".'),
  options: z
    .array(z.string())
    .length(4)
    .describe('An array of four possible answers for the analogy, each in the format "TERM3 : TERM4".'),
  correct: z.string().describe('The correct answer from the options.'),
  explanation: z.string().describe('A semantic explanation in Arabic of the logical relationship between the terms in the analogy and why the correct option fits.'),
});
export type GenerateVerbalAnalogyOutput = z.infer<typeof GenerateVerbalAnalogyOutputSchema>;

export async function generateVerbalAnalogy(
  input: GenerateVerbalAnalogyInput
): Promise<GenerateVerbalAnalogyOutput> {
  return generateVerbalAnalogyFlow(input);
}

const generateVerbalAnalogyPrompt = ai.definePrompt({
  name: 'generateVerbalAnalogyPrompt',
  input: {schema: GenerateVerbalAnalogyInputSchema},
  output: {schema: GenerateVerbalAnalogyOutputSchema},
  prompt: `أنت خبير في بناء أسئلة القدرات اللفظية باللغة العربية. مهمتك هي إنشاء سؤال تناظر لفظي فريد بناءً على مستوى الصعوبة والفئة المحددين.\n\nمستوى الصعوبة المطلوب: {{{difficulty}}}\nفئة العلاقة المطلوبة: {{{category}}}\n\nيجب أن تلتزم بتنسيق JSON المطلوب بدقة، وأن يكون السؤال باللغة العربية الفصحى.\nالعلاقة في السؤال يجب أن تكون دقيقة وواضحة.\nالخيارات يجب أن تكون متنوعة ومتقاربة، مع وجود خيار واحد صحيح وثلاثة خيارات خاطئة لكنها معقولة (مشتتات).\nيجب أن تقدم شرحاً واضحاً ومفصلاً باللغة العربية للعلاقة المنطقية بين مصطلحات السؤال ولماذا الخيار الصحيح هو الأنسب.\n\nمثال للتنسيق المطلوب:\n{\n  "question": "عَصَبَة : نَاس",\n  "options": ["كتيبة : جند", "قطيع : غزال", "مطار : طيارة", "طريق : محطة"],\n  "correct": "كتيبة : جند",\n  "explanation": "العلاقة هنا هي 'مجموعة من': العصابة هي مجموعة من الناس، والكتيبة هي مجموعة من الجند."
}\n\nالآن قم بإنشاء السؤال وفقاً للمعطيات.`,
});

const generateVerbalAnalogyFlow = ai.defineFlow(
  {
    name: 'generateVerbalAnalogyFlow',
    inputSchema: GenerateVerbalAnalogyInputSchema,
    outputSchema: GenerateVerbalAnalogyOutputSchema,
  },
  async (input) => {
    const {output} = await generateVerbalAnalogyPrompt(input);
    if (!output) {
      throw new Error('Failed to generate verbal analogy question.');
    }
    return output;
  }
);
