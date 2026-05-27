# QuantGuide Question

## 1058. Horse Results

**Metadata**

- ID: `6lEniR1W7CvDjKmiI3th`
- URL: https://www.quantguide.io/questions/horse-results
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission
- Source: OMC OA
- Tags: Events
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 23:44:04 America/New_York
- Last Edited By: Gabe

### 题干

$$6$ equally-skilled swimmers labeled $1-6$ are racing. Find the probability that swimmer $2$ ends up in $2$nd place and swimmer $5$ is in the top $3$ somewhere.

### Hint

Since each swimmer is equally-skilled, by the exchangeability of the swimmers, each one ends up in each of the $6$ spots with probability $\dfrac{1}{6}$. 

### 解答

As we know each swimmer is equally-skilled, by the exchangeability of the swimmers, each one ends up in each of the $6$ places with probability $\dfrac{1}{6}$. Swimmer $2$ ends up in $2$nd place with probability $\dfrac{1}{6}$. Then, given that, there are $2$ spots left in the top $3$ for swimmer $5$ to go into. As one is taken by swimmer $2$, the probability swimmer $5$ is in the top $3$ is $\dfrac{2}{5}$. Therefore, our answer is $\dfrac{1}{6} \cdot \dfrac{2}{5} = \dfrac{1}{15}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/15"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6lEniR1W7CvDjKmiI3th",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 23:44:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8619366,
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Horse Results",
    "topic": "probability",
    "urlEnding": "horse-results"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "6lEniR1W7CvDjKmiI3th",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Horse Results",
    "topic": "probability",
    "urlEnding": "horse-results"
  }
}
```
