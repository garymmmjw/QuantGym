# QuantGuide Question

## 264. Dog Days

**Metadata**

- ID: `KsfKEvXho5OKyGWAXBeD`
- URL: https://www.quantguide.io/questions/dog-days
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: N/A
- Tags: Conditional Probability, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 21:21:44 America/New_York
- Last Edited By: Gabe

### 题干

Every day is either good (G) or bad (B). If today was G, tomorrow is also G with probability $\dfrac{3}{5}$. If today was B, tomorrow is also B with probability $\dfrac{7}{10}$. You woke up to find that today is a bad day. Find the expected number of days until another bad day.

### Hint

How can you use the Law of Total Expectation to condition on the outcome of outcome of the first day?

### 解答

Let $T$ be the number of days until another bad day and $X_1$ be the outcome of the first day since today. Then $\mathbb{E}_B[T] = \mathbb{E}_B[T \mid B]\mathbb{P}_B[B] + \mathbb{E}_B[T \mid G]\mathbb{P}_B[G]$. The subscript $B$ is to denote that we start on a bad day. We have that $\mathbb{P}_B[B] = \dfrac{7}{10}$, so $\mathbb{P}_B[G] = \dfrac{3}{10}$. Then, $\mathbb{E}_B[T \mid G] = 1 + \mathbb{E}_G[T]$, as we take one step and then find the expected number of days starting from a good day until a bad day. Then, $\mathbb{E}_B[T \mid B] = 1$, as it takes just $1$ day to get another bad day if the first day after is bad. Therefore, $$\mathbb{E}_B[T] = (1 + \mathbb{E}_G[T]) \cdot \dfrac{3}{10} + 1 \cdot \dfrac{7}{10} = 1 + \dfrac{3}{10} \cdot \mathbb{E}_G[T]$$ Note that the distribution of the number of days until a bad day starting from a good day is Geom$\left(\dfrac{2}{5}\right)$, as there is a $\dfrac{2}{5}$ probability each day of going to a bad day, so $\mathbb{E}_G[T] = \dfrac{5}{2}$. This implies that $\mathbb{E}_B[T] = 1 + \dfrac{3}{10} \cdot \dfrac{5}{2} = \dfrac{7}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/4"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "KsfKEvXho5OKyGWAXBeD",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:21:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2049958,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dog Days",
    "topic": "probability",
    "urlEnding": "dog-days",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "KsfKEvXho5OKyGWAXBeD",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dog Days",
    "topic": "probability",
    "urlEnding": "dog-days"
  }
}
```
