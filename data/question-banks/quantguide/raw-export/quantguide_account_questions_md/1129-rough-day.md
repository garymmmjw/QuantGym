# QuantGuide Question

## 1129. Bad Bagel

**Metadata**

- ID: `6NRqOM4U8iB7ZnDVeZsL`
- URL: https://www.quantguide.io/questions/rough-day
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, Jane Street
- Source: N/A
- Tags: Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-7 23:31:54 America/New_York
- Last Edited By: Gabe

### 题干

A bagel factory has a conveyor belt that delivers bagels continuously. Every bagel is either good (G) or bad (B). If a given bagel was G, the next bagel is also G with probability $\dfrac{2}{5}$. If a given bagel was B, the next bagel is also B with probability $\dfrac{3}{5}$. You woke up to find that the first bagel is a bad one. Find the expected number of bagels that pass until another bad bagel.

### Hint

How can you use the Law of Total Expectation to condition on the outcome of outcome of the first bagel since our present one?

### 解答

Let $T$ be the number of bagels until another bad one and $X_1$ be the outcome of the first bagel since our present one. Then $$\mathbb{E}_B[T] = \mathbb{E}_B[T \mid B]\mathbb{P}_B[B] + \mathbb{E}_B[T \mid G]\mathbb{P}_B[G]$$ The subscript $B$ is to denote that we start on a bad bagel. We have that $\mathbb{P}_B[B] = \dfrac{3}{5}$, so $\mathbb{P}_B[G] = \dfrac{2}{5}$. Then, $\mathbb{E}_B[T \mid G] = 1 + \mathbb{E}_G[T]$, as we take one step and then find the expected number of bagels starting from a good bagel until a bad bagel. Then, $\mathbb{E}_B[T \mid B] = 1$, as it takes just $1$ bagel to get another bad bagel if the first bagel after is bad. Therefore, $$\mathbb{E}_B[T] = (1 + \mathbb{E}_G[T]) \cdot \dfrac{2}{5} + 1 \cdot \dfrac{3}{5} = 1 + \dfrac{2}{5} \cdot \mathbb{E}_G[T]$$ Note that the distribution of the number of bagels until a bad bagel starting from a good bagel is $\text{Geom}\left(\dfrac{3}{5}\right)$, as there is a $\dfrac{3}{5}$ probability each bagel of going to a bad bagel, so $\mathbb{E}_G[T] = \dfrac{5}{3}$. This implies that $\mathbb{E}_B[T] = 1 + \dfrac{2}{5} \cdot \dfrac{5}{3} = \dfrac{5}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6NRqOM4U8iB7ZnDVeZsL",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 23:31:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9315608,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Bad Bagel",
    "topic": "probability",
    "urlEnding": "rough-day",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "6NRqOM4U8iB7ZnDVeZsL",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Bad Bagel",
    "topic": "probability",
    "urlEnding": "rough-day"
  }
}
```
