# QuantGuide Question

## 149. Socks and Shelves

**Metadata**

- ID: `CYAUNGGz8EgtvyBadyYv`
- URL: https://www.quantguide.io/questions/socks-and-shelves
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: Kaushik - SIG Glassdoor
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-8-28 18:20:39 America/New_York
- Last Edited By: Gabe

### 题干

There are two shelves, the top and bottom. The top shelf contains red socks with probability $0.4$ and black socks with probability $0.6$. The bottom shelf contains red socks with probability $0.7$ and black socks with probability $0.3$. I pick a shelf randomly. From that self, I picked $2$ red socks. What is the probability that those $2$ red socks come from the top shelf? Assume you have so many socks that taking from either shelf does not change the probability of future socks that are drawn.


### Hint

What methods can we use to solve conditional probability questions?

### 解答

This is a classic conditional probability question. A sure fire way to do this problem is to use Bayes Theorem. Applying Bayes for $$\mathbb{P}[\text{Top\:Shelf} | RR] =$$  $$\dfrac{\mathbb{P}[RR | \text{Top\:Shelf}] \cdot \mathbb{P}[\text{Top\:Shelf}]}{\mathbb{P}[RR]} = \dfrac{0.4\cdot0.4\cdot0.5}{0.4\cdot0.4\cdot0.5+0.7\cdot0.7\cdot0.5} = \dfrac{16}{65}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/65"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "CYAUNGGz8EgtvyBadyYv",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 18:20:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1115415,
    "source": "Kaushik - SIG Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Socks and Shelves",
    "topic": "probability",
    "urlEnding": "socks-and-shelves",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "CYAUNGGz8EgtvyBadyYv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Socks and Shelves",
    "topic": "probability",
    "urlEnding": "socks-and-shelves"
  }
}
```
