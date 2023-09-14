import { FastifyInstance } from "fastify";
import { createReadStream } from 'node:fs'
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
	app.post('/videos/:videoID/transcription', async (req) => {
		const paramsSchema = z.object({
			videoID: z.string().uuid(),
		})

		const { videoID } = paramsSchema.parse(req.params)

		const bodySchema = z.object({
			prompt: z.string(),
		})

		const { prompt } = bodySchema.parse(req.body)

		const { path: videoPath } = await prisma.video.findUniqueOrThrow({
			where: {
				id: videoID
			}
		})

		const audioReadStream = createReadStream(videoPath)

		const response = await openai.audio.transcriptions.create({
			file: audioReadStream,
			model: 'whisper-1',
			language: 'pt',
			response_format: 'json',
			temperature: 0,
			prompt, 
		})

		const transcription = response.text

		await prisma.video.update({
			where: {
				id: videoID,
			},
			data: {
				transcription,
			}
		})

		return { transcription }
	})
}