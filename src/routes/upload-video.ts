import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart"
import path from "node:path";
import fs from "node:fs"
import { pipeline } from "node:stream"
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma";

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
	app.register(fastifyMultipart, {
		limits: {
			fileSize: 1_048_576 * 25 // 25 mb
		}
	})

	app.post('/videos', async (request, reply) => {
		const data = await request.file()

		if (!data) {
			return reply.status(400).send({ error: 'Missing file input.' })
		}

		const extension = path.extname(data.filename)
		console.log(extension)

		if (extension != ".mp3") {
			return reply.status(400).send({ error: 'Invalid file extension, only MP3 is accepted.' })
		}

		const fileBaseName = path.basename(data.filename, extension)
		const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`

		const audiosFolderDir = path.resolve(__dirname, '..', '..', 'tmp')
		const uploadDestination = path.resolve(audiosFolderDir, fileUploadName)

		await pump(data.file, fs.createWriteStream(uploadDestination))

		const video = await prisma.video.create({
			data: {
				name: data.filename,
				path: uploadDestination
			}
		})

		return {
			video,
		}
	})
}