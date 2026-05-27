# QuantGuide Question

## 752. Couples Reunited

**Metadata**

- ID: `Fi3MWtMGJALuz0gUGvKc`
- URL: https://www.quantguide.io/questions/couples-reunited
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: JHU Prof
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 09:41:00 America/New_York
- Last Edited By: Gabe

### 题干

$$9$ married couples ($1$ male and $1$ female) are standing in a line. They all scatter around and form $9$ pairs uniformly at random. Find the expected number of couples that are paired up together. Note that pairs can also consist of members of the same gender.

### Hint

Label the couples $1-9$ and let $I_i$ be the indicator that the $i$th couple is paired up together.

### 解答

Label the couples $1-9$ and let $I_i$ be the indicator that the $i$th married couple is paired up together. Then $T = I_1 + \dots I_9$ gives the total number of couples that are paired up. By linearity of expectation and the exchangeability of the couples (no couple is more likely to be paired up together than any other), $\mathbb{E}[T] = 9\mathbb{E}[I_1]$. $\mathbb{E}[I_1]$ is just the probability that couple $1$ is paired together. Fix the first member of the couple in some random pair. Of the 17 other people that can be this person's partner in the pair, only 1 is their married partner, so $\mathbb{E}[I_1] = \dfrac{1}{17}$. Thus, by plugging in above, $\mathbb{E}[T] = \dfrac{9}{17}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/17"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Fi3MWtMGJALuz0gUGvKc",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:41:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6122573,
    "source": "JHU Prof",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Couples Reunited",
    "topic": "probability",
    "urlEnding": "couples-reunited",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "Fi3MWtMGJALuz0gUGvKc",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Couples Reunited",
    "topic": "probability",
    "urlEnding": "couples-reunited"
  }
}
```
