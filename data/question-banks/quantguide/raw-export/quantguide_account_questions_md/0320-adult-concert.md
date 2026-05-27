# QuantGuide Question

## 320. Adult Concert

**Metadata**

- ID: `0mJJ9KaBGfuOnG7jTKFq`
- URL: https://www.quantguide.io/questions/adult-concert
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Two Sigma, Jane Street
- Source: AIME
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:36:35 America/New_York
- Last Edited By: Gabe

### 题干

$$\frac{5}{12}$ of concert attendees are adults. A bus carrying 50 people arrives at the concert. Now, $\frac{11}{25}$ of concert attendees are adults. What is the minimum number of adults who could have been at the concert before the bus arrived?

### Hint

Let $x$ denote the total number of people at the concert before the bus arrives. $x \equiv 0 \mod 12$ from the question. What do you know about $x + 50$?

### 解答

Let $x$ denote the total number of people at the concert before the bus arrives. $x \equiv 0 \mod 12$. Then, $x + 50 \equiv 0 \mod 25$. Since $50 \equiv 0 \mod 25$, we can rewrite the previous expression as $x \equiv 0 \mod 25$. The minimum possible value of $x$ satisfying these two conditions is $x = 300$. $x \cdot \frac{5}{12} = 125$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "125"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "0mJJ9KaBGfuOnG7jTKFq",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:36:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2481892,
    "randomizable": "",
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Adult Concert",
    "topic": "brainteasers",
    "urlEnding": "adult-concert",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "0mJJ9KaBGfuOnG7jTKFq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Adult Concert",
    "topic": "brainteasers",
    "urlEnding": "adult-concert"
  }
}
```
