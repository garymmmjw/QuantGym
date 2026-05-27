# QuantGuide Question

## 817. Meek Mill

**Metadata**

- ID: `fZwY3ea6p1iMMP8M41oN`
- URL: https://www.quantguide.io/questions/meek-mill
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG, Citadel
- Source: original
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 10:37:26 America/New_York
- Last Edited By: Gabe

### 题干

Meek Mill is performing at Spring Fair. The administration does not know where he is, and they estimate there is an $80\%$ chance he is in Philadelphia and $20\%$ chance he is in Baltimore. If he is in Baltimore, there is a $80\%$ chance he will perform. If he is in Philadelphia, there is a $10\%$ chance he will perform. Find the probability that if Meek Mill performs, he came from Philadelphia.

### Hint

Let $P$ be the event Meek Mill performs, $L$ be the event he is in Philadelphia, and $B$ be the event he is in Baltimore. You want $\mathbb{P}[L \mid P]$.

### 解答

Let $P$ be the event Meek Mill performs, $L$ be the event he is in Philadelphia, and $B$ be the event he is in Baltimore. We want $$\mathbb{P}[L \mid P] = \dfrac{\mathbb{P}[PL]}{\mathbb{P}[L]} = \dfrac{\mathbb{P}[P \mid L]\mathbb{P}[L]}{\mathbb{P}[P \mid L]\mathbb{P}[L] + \mathbb{P}[P \mid B]\mathbb{P}[B]} = \dfrac{0.8 \cdot 0.1}{0.8 \cdot 0.1 + 0.2 \cdot 0.8} = \dfrac{1}{3}$$ All of the quantities are derived from the question itself by interpreting them in our language of events.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "fZwY3ea6p1iMMP8M41oN",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 10:37:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6692628,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Meek Mill",
    "topic": "probability",
    "urlEnding": "meek-mill",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "fZwY3ea6p1iMMP8M41oN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Meek Mill",
    "topic": "probability",
    "urlEnding": "meek-mill"
  }
}
```
