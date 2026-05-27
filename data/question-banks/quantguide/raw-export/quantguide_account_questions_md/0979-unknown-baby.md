# QuantGuide Question

## 979. Unknown Baby

**Metadata**

- ID: `DYsp1Gg0wqJOPSUqzsw7`
- URL: https://www.quantguide.io/questions/unknown-baby
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Morgan Stanley, SIG, JP Morgan, Goldman Sachs, IMC
- Source: Morgan Stanley glassdoor
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 00:31:02 America/New_York
- Last Edited By: Gabe

### 题干

There are $5$ babies in a room: $2$ boys and $3$ girls. one baby with unknown sex is added. One baby is random selected and it is a boy. What's the probability that the added baby is a boy? You may assume that each gender is equally likely at birth.

### Hint

Let $B$ be the event that the baby added was a boy. Let $S$ be the event that the selected baby was a boy. We want $\mathbb{P}[B \mid S] = \dfrac{\mathbb{P}[S \mid B]\mathbb{P}[B]}{\mathbb{P}[S]}$.

### 解答

Let $B$ be the event that the baby added was a boy. Let $S$ be the event that the selected baby was a boy. We want $\mathbb{P}[B \mid S] = \dfrac{\mathbb{P}[S \mid B]\mathbb{P}[B]}{\mathbb{P}[S]}$. We know that $\mathbb{P}[B] = \dfrac{1}{2}$, as this is with no other information. We further know that if the added baby was a boy, then $\mathbb{P}[S \mid B] = \dfrac{1}{2}$, as there are equal amounts of boys and girls. On the denominator, we condition on $B$ and $B^c$. Namely, $$\mathbb{P}[S] = \mathbb{P}[S \mid B]\mathbb{P}[B] + \mathbb{P}[S \mid B^c]\mathbb{P}[B^c]$$ The first term is the same as the numerator. We know that $\mathbb{P}[B^c] = \dfrac{1}{2}$ as well. $B^c$ is the event a girl was added, so in this case, $\mathbb{P}[S \mid B^c] = \dfrac{1}{3}$, as there are only $2$ boys among $6$ total. Therefore, our total probability is $$\mathbb{P}[B \mid S] = \dfrac{1/2 \cdot 1/2}{1/2 \cdot 1/2 + 1/2 \cdot 1/3} = \dfrac{3}{5}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/5"
    ],
    "companies": [
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "SIG"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "DYsp1Gg0wqJOPSUqzsw7",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:31:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7987216,
    "source": "Morgan Stanley glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Unknown Baby",
    "topic": "probability",
    "urlEnding": "unknown-baby",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "SIG"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "DYsp1Gg0wqJOPSUqzsw7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Unknown Baby",
    "topic": "probability",
    "urlEnding": "unknown-baby"
  }
}
```
