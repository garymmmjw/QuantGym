# QuantGuide Question

## 928. Portfolio Returns

**Metadata**

- ID: `6gNEK7nr8M9aw5C5B3my`
- URL: https://www.quantguide.io/questions/portfolio-returns
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:17:45 America/New_York
- Last Edited By: Gabe

### 题干

You have an equally-weighted portfolio consisting of three assets with the following annual returns: Asset A has a 30% chance of a 10% return, a 50% chance of a 5% return, and a 20% chance of a -2% return. Asset B has a 40% chance of a 12% return, a 30% chance of a 7% return, and a 30% chance of a -4% return. Asset C has a 20% chance of a 18% return, a 50% chance of a 3% return, and a 30% chance of a -1% return. What is the expected annual return of your portfolio (written as a decimal)?

### Hint

Use the linearity of expectation on the returns of each asset to get the expected return of the portfolio.

### 解答

Let $A,B,C$ represent the returns of each asset in the portfolio. Then $T = \frac{1}{3}(A+B+C)$ gives us the return of the portfolio. By linearity of expectation, $3\mathbb{E}[T] = \mathbb{E}[A] + \mathbb{E}[B] + \mathbb{E}[C]$. To calculate the expectation of each portfolio, we just have to sum up the returns weighted by their probabilities. We get that $\mathbb{E}[A] = 0.3 \cdot 10 + 0.5 \cdot 5 + 0.2 \cdot (-2) = 5.1$, $\mathbb{E}[B] = 0.4 \cdot 12 + 0.3 \cdot 7 + 0.3 \cdot (-4) = 5.7$, and $\mathbb{E}[C] = 0.2 \cdot 18 + 0.5 \cdot 3 + 0.3 \cdot (-1) = 4.8$. Therefore, $\mathbb{E}[T]$ = 5.2% = 0.052.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.052"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6gNEK7nr8M9aw5C5B3my",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:17:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7599250,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Portfolio Returns",
    "topic": "probability",
    "urlEnding": "portfolio-returns",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "6gNEK7nr8M9aw5C5B3my",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Portfolio Returns",
    "topic": "probability",
    "urlEnding": "portfolio-returns"
  }
}
```
