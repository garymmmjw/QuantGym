# QuantGuide Question

## 832. Dangerous Doubles

**Metadata**

- ID: `y4d3RElKLd3JQ2SAwvcJ`
- URL: https://www.quantguide.io/questions/dangerous-doubles
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission
- Source: OMC OA
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:35:05 America/New_York
- Last Edited By: Gabe

### 题干

Two fair coins are flipped at once. You receive $\$2$ if exactly one heads that appears, but you lose $\$7$ if you flip two heads. What is your expected profit/loss on this game if you play once?

### Hint

Two fair coins are flipped at once. You receive $\$2$ for each heads that appears but you lose $\$7$ if you flip two heads. What is your expected profit/loss on this game if you play once?

### 解答

The four possible outcomes of this game are $TT,HT,TH,$ and $HH$. $TT$ gives you $\$0$, as there are no heads. $HT$ and $TH$ both give you $\$2$, as there is exactly one head. $HH$ makes you pay $\$7$ by the information in the question. As all four outcomes are equally likely, our expected profit/loss on the game is $\dfrac{0+2+2-7}{4} = -\dfrac{3}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-3/4"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "y4d3RElKLd3JQ2SAwvcJ",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:35:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6838288,
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Dangerous Doubles",
    "topic": "probability",
    "urlEnding": "dangerous-doubles",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "y4d3RElKLd3JQ2SAwvcJ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Dangerous Doubles",
    "topic": "probability",
    "urlEnding": "dangerous-doubles"
  }
}
```
