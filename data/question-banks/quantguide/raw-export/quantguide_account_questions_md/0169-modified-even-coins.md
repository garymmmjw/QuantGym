# QuantGuide Question

## 169. Modified Even Coins

**Metadata**

- ID: `t1xxoG2e0CMl7QMVWsa8`
- URL: https://www.quantguide.io/questions/modified-even-coins
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, SIG, Akuna, Citadel, Virtu Financial
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-5 10:28:00 America/New_York
- Last Edited By: Gabe

### 题干

$$n$ coins are laid out in front of you. One of the coins is fair, while the other $n-1$ have probability $0 < \lambda < 1$ of showing heads. If all $n$ coins are flipped, find the probability of an even amount of heads.

### Hint

Try to condition on the outcome of the fair coin. Note that in order to observe an even number of heads, either the fair coin shows heads and the other $n-1$ coins show an odd number of heads, or the fair coin shows tails and the other $n-1$ coins show an even number of heads.

### 解答

To obtain an even amount of heads, we have two options. If the fair coin shows $H$, then we must show an odd amount of heads on the other $n-1$ coins to obtain an even total. Alternatively, if the fair coin shows $T$, then we must show an even amount of heads on the other $n-1$ coins to obtain. If $p$ is the probability of an even amount of heads on the other $n-1$ non-fair coins, then by Law of Total Probability, our probability of interest is $\dfrac{1}{2}\cdot p + \dfrac{1}{2} \cdot (1-p) = \dfrac{1}{2}$. This is because the complement of an even amount of heads is an odd amount, and these probabilities are weighted equally in the computation, so they cancel out.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "t1xxoG2e0CMl7QMVWsa8",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:28:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1301053,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Modified Even Coins",
    "topic": "probability",
    "urlEnding": "modified-even-coins",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "t1xxoG2e0CMl7QMVWsa8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Modified Even Coins",
    "topic": "probability",
    "urlEnding": "modified-even-coins"
  }
}
```
