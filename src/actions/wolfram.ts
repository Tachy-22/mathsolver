'use server'

import { z } from 'zod'

const wolframResponseSchema = z.object({
  queryresult: z.object({
    success: z.boolean(),
    error: z.boolean().optional(),
    numpods: z.number(),
    datatypes: z.string().optional(),
    timedout: z.string().optional(),
    timing: z.number(),
    parsetiming: z.number(),
    pods: z.array(z.object({
      title: z.string(),
      scanner: z.string(),
      id: z.string(),
      position: z.number(),
      error: z.boolean().optional(),
      numsubpods: z.number(),
      subpods: z.array(z.object({
        plaintext: z.string().optional(),
        img: z.object({
          src: z.string(),
          alt: z.string(),
          title: z.string(),
          width: z.number(),
          height: z.number(),
        }).optional(),
      })),
    })),
    assumptions: z.array(z.object({
      type: z.string(),
      word: z.string(),
      template: z.string(),
      count: z.number(),
      values: z.array(z.object({
        name: z.string(),
        desc: z.string(),
        input: z.string(),
      })),
    })).optional(),
  }),
})

type WolframResponse = z.infer<typeof wolframResponseSchema>

export async function queryWolfram(input: string) {
  if (!process.env.WOLFRAM_APP_ID) {
    throw new Error('WOLFRAM_APP_ID environment variable is not set')
  }

  try {
    const response = await fetch(
      `https://api.wolframalpha.com/v2/query?` +
      new URLSearchParams({
        input,
        appid: process.env.WOLFRAM_APP_ID,
        output: 'json',
        format: 'plaintext,image',
        podstate: 'Step-by-step solution',
        scantimeout: '3.0',
        podtimeout: '4.0',
        formattimeout: '8.0',
        parsetimeout: '4.0',
      })
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Validate response data against schema
    const parsedData = wolframResponseSchema.parse(data)

    if (!parsedData.queryresult.success) {
      throw new Error('Wolfram Alpha query was unsuccessful')
    }

    return {
      success: true as const,
      data: parsedData
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Response validation error:', error.errors)
      return {
        success: false as const,
        error: 'Invalid response format from Wolfram Alpha'
      }
    }

    if (error instanceof Error) {
      console.error('Wolfram Alpha API error:', error.message)
      return {
        success: false as const,
        error: error.message
      }
    }

    console.error('Unknown error:', error)
    return {
      success: false as const,
      error: 'An unknown error occurred'
    }
  }
}
