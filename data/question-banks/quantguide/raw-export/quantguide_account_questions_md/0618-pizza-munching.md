# QuantGuide Question

## 618. Pizza Munching

**Metadata**

- ID: `1RWP6REWkBoRMZyLrorN`
- URL: https://www.quantguide.io/questions/pizza-munching
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission
- Source: OMC OA
- Tags: Events, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 23:39:19 America/New_York
- Last Edited By: Gabe

### 题干

Garrett loves eating pizza, but enjoys savoring the slices too. The time it takes for him to eat a pizza slice is uniformly distributed between $1$ and $5$ minutes. If he has been eating for $2$ minutes and still isn't done, find the probability that he finishes the slice in the next minute.

### Hint

Let $T$ be the amount of time that Garrett takes to eat his slice of pizza. We know that $T \sim \text{Unif}(1,5)$ from the question. We know he has spent at least $2$ minutes eating his slice, and we want the probability he finishes in the next minute. What specific probability are we interested in?

### 解答

Let $T$ be the amount of time that Garrett takes to eat his slice of pizza. We know that $T \sim \text{Unif}(1,5)$ from the question. We know he has spent at least $2$ minutes eating his slice, and we want the probability he finishes in the next minute, so we want $\mathbb{P}[T \leq 3 \mid T \geq 2]$. By the definition of conditional probability, this is $$\dfrac{\mathbb{P}[2 \leq  T \leq 3]}{\mathbb{P}[T \geq 2]} = \dfrac{\frac{1}{4}}{\frac{3}{4}} = \dfrac{1}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1RWP6REWkBoRMZyLrorN",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 23:39:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4896596,
    "randomizable": "",
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Pizza Munching",
    "topic": "probability",
    "urlEnding": "pizza-munching"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "1RWP6REWkBoRMZyLrorN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Pizza Munching",
    "topic": "probability",
    "urlEnding": "pizza-munching"
  }
}
```
