# QuantGuide Question

## 570. Deviating Sums

**Metadata**

- ID: `q4UXyPzMGFYHUef0JKUZ`
- URL: https://www.quantguide.io/questions/deviating-sums
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Valkyrie Trading
- Source: Kaushik - Own
- Tags: Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-26 22:50:37 America/New_York
- Last Edited By: Aaron

### 题干

Two identical sets of cards are in front of you. Each set has $5$ cards labeled $0-4$. You pick a card from each set and add them together. What is the standard deviation of sum of the cards chosen?

### Hint

What properties of variance can we use to solve this problem?

### 解答

Let $X$ be the number chosen from the first set and $Y$ be the number chosen from the second set. Since $X$ and $Y$ are independent, we know that $$Var(X+Y)=Var(X)+Var(Y) = 2\cdot Var(X)$$
To find $Var(X)$, we can use the equation $Var(X) = E(X^2)-E(X)^2$. 
$$E(X^2) = \dfrac{0^2+1^2+2^2+3^2+4^2}{5}=6$$
$$E(X)^2 = (\frac{0+1+2+3+4}{5})^2 = 2^2=4$$
Thus $Var(X)=6-4=2$ and $Var(X+Y) = 2\cdot2 = 4$. Since we are finding the standard deviation, we have to take the square root of the variance. Thus the answer is $2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Valkyrie Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "q4UXyPzMGFYHUef0JKUZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 22:50:37 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 4588153,
    "source": "Kaushik - Own",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Deviating Sums",
    "topic": "probability",
    "urlEnding": "deviating-sums",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Valkyrie Trading"
      }
    ],
    "difficulty": "easy",
    "id": "q4UXyPzMGFYHUef0JKUZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Deviating Sums",
    "topic": "probability",
    "urlEnding": "deviating-sums"
  }
}
```
