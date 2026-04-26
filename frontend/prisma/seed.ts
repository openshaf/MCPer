import "dotenv/config";
import { PrismaClient } from '../src/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const apis = [
  { name: "GitHub REST API", url: "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json", requiresApiKey: true },
  { name: "OpenAI API", url: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml", requiresApiKey: true },
  { name: "Stripe API", url: "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json", requiresApiKey: true },
  { name: "Slack Web API", url: "https://raw.githubusercontent.com/slackapi/slack-api-specs/master/web-api/slack_web_openapi_v2.json", requiresApiKey: true },
  { name: "Discord API", url: "https://raw.githubusercontent.com/discord/discord-api-spec/main/specs/openapi.json", requiresApiKey: true },
  { name: "GitLab API", url: "https://gitlab.com/gitlab-org/gitlab/-/raw/master/doc/api/openapi/openapi.yaml", requiresApiKey: true },
  { name: "Twitter/X API", url: "https://raw.githubusercontent.com/twitterdev/twitter-api-typescript-sdk/main/openapi/openapi.json", requiresApiKey: true },
  { name: "Spotify Web API", url: "https://raw.githubusercontent.com/sonallux/spotify-web-api/main/fixed-spotify-open-api.yml", requiresApiKey: true },
  { name: "Swagger Petstore", url: "https://petstore.swagger.io/v2/swagger.json", requiresApiKey: false },
  { name: "XKCD API", url: "https://xkcd.com", requiresApiKey: false },
  { name: "Cat Facts API", url: "https://catfact.ninja/docs/api-docs.json", requiresApiKey: false },
  { name: "Notion API", url: "https://raw.githubusercontent.com/jens-ox/notion-openapi/main/notion-openapi.yaml", requiresApiKey: true },
  { name: "Jira Cloud API", url: "https://developer.atlassian.com/cloud/jira/platform/swagger.v3.json", requiresApiKey: true },
  { name: "Linear API", url: "https://raw.githubusercontent.com/linear/linear-openapi/main/openapi.json", requiresApiKey: true },
  { name: "Cohere API", url: "https://raw.githubusercontent.com/cohere-ai/openapi/main/openapi.yaml", requiresApiKey: true },
  { name: "Anthropic API", url: "https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/openapi.yaml", requiresApiKey: true },
  { name: "Supabase API", url: "https://raw.githubusercontent.com/supabase/supabase/master/spec/openapi.yaml", requiresApiKey: true },
  { name: "Google Books API", url: "https://www.googleapis.com/discovery/v1/apis/books/v1/rest", requiresApiKey: true },
  { name: "JSONPlaceholder API", url: "https://jsonplaceholder.typicode.com", requiresApiKey: false },
  { name: "Dog API", url: "https://dog.ceo/api/swagger.json", requiresApiKey: false },
]

async function main() {
  // Create the table if it doesn't exist (makes seed self-contained)
  console.log('Ensuring ApiTemplate table exists...')
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ApiTemplate" (
      "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name"           TEXT NOT NULL,
      "url"            TEXT NOT NULL,
      "requiresApiKey" BOOLEAN NOT NULL DEFAULT false,
      "spec"           JSONB,
      CONSTRAINT "ApiTemplate_pkey" PRIMARY KEY ("id")
    )
  `)

  console.log('Clearing existing ApiTemplates...')
  await prisma.apiTemplate.deleteMany()

  console.log('Seeding APIs...')
  for (const api of apis) {
    try {
      console.log(`Fetching ${api.name}...`)
      const res = await fetch(api.url)
      let text = ""
      if (!res.ok) {
        console.warn(`Failed to fetch ${api.url}: ${res.statusText}`)
      } else {
        text = await res.text()
      }
      
      let specJson = null
      if (text) {
        try {
          specJson = JSON.parse(text)
        } catch (e) {
          // If it's yaml or HTML, just store the raw string wrapped in JSON
          specJson = { rawSpec: text }
        }
      }

      await prisma.apiTemplate.create({
        data: {
          name: api.name,
          url: api.url,
          requiresApiKey: api.requiresApiKey,
          spec: specJson
        }
      })
      console.log(`Inserted ${api.name}`)
    } catch (err) {
      console.error(`Error processing ${api.name}:`, err)
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
