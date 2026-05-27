# QuantGuide Question

## 831. Close Couples

**Metadata**

- ID: `9uMb9Qn4a1ZIGe40AAr4`
- URL: https://www.quantguide.io/questions/close-couples
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 21:08:32 America/New_York
- Last Edited By: Gabe

### 题干

$$n$ married couples ($n$ husbands and $n$ wives) sit at a round table of $2n$ seats at random. The seating scheme is such that the seats must alternate between men and women. Find the number of couples that will sit together $\mathbb{E}[N]$ on average. Assume $n>2$.

### Hint

Let $I_i$ be the indicator that couple $i$ sits together. How can you use the Linearity of Expectation to solve this problem?

### 解答

Let $I_i$ be the indicator that couple $i$ sits together. Then we have that $T = \displaystyle \sum_{i=1}^n I_i$ counts the number of couples that sit together total. By linearity of expectation, $\mathbb{E}[T] = \displaystyle \sum_{i=1}^n \mathbb{E}[I_i]$. We have that $\mathbb{E}[I_i]$ is the probability couple $i$ sits together. Fix the husband within couple $i$ at an arbitrary seat in the table. The two people on either side of him must be women, as there is an alternating pattern at the table. Therefore, of the $n$ spots that this man's wife can sit at, 2 are adjacent to him, and all arrangements are equally likely. Therefore, the probability of this is just $\dfrac{2}{n}$. Therefore, we have that $\mathbb{E}[I_i] = \dfrac{2}{n}$, so $\mathbb{E}[T] = \displaystyle \sum_{i=1}^n \dfrac{2}{n} = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "9uMb9Qn4a1ZIGe40AAr4",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 21:08:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6837841,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Close Couples",
    "topic": "probability",
    "urlEnding": "close-couples"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "9uMb9Qn4a1ZIGe40AAr4",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Close Couples",
    "topic": "probability",
    "urlEnding": "close-couples"
  }
}
```
