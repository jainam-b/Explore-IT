const axios = require('axios');
const { print } = require('graphql/language/printer');
const gql = require('graphql-tag');
const { API, graphqlOperation } = require('aws-amplify');


const CHAT_GPT_API_KEY = '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';

async function generateJoke(text) {
  const url = 'https://api.openai.com/v1/engines/davinci-codex/completions';
  const prompt = `Create a funny headline based on the news: "${text}"`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CHAT_GPT_API_KEY}`,
  };

  const data = {
    prompt: prompt,
    max_tokens: 20,
    n: 1,
    stop: null,
    temperature: 0.7,
  };

  try {
    const response = await axios.post(url, data, { headers: headers });
    const joke = response.data.choices[0].text.trim();
    return joke;
  } catch (error) {
    console.error('Error generating joke:', error);
    return '';
  }
}

exports.handler = async (event, context) => {
  try {
    // Retrieve news data from API
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: 'us',
        apiKey: process.env.NEWS_API_KEY
      }
    });

    // Format news data to match GraphQL schema
    const news = response.data.articles.map(async (article) => {
      const joke = await generateJoke(article.title+ " " + article.content);
      return {
        title: article.title,
        author: article.author,
        description: article.description,
        url: article.url,
        imageUrl: article.urlToImage,
        content: article.content,
        source: article.source.name,
        publishedAt: article.publishedAt,
        jokes: {
          create: {
            joke: joke
          }
        }
      }
    });

    // Publish news data to GraphQL database
    const mutation = gql(print(mutations.createNews));
    const variables = { news: await Promise.all(news) };
    const result = await API.graphql(graphqlOperation(mutation, variables));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'News updated successfully' })
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating news' })
    };
  }
};
