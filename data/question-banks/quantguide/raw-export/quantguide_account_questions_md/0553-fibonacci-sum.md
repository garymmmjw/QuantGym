# QuantGuide Question

## 553. Fibonacci Sum

**Metadata**

- ID: `7akVMTxZ74jk5u6R4GBD`
- URL: https://www.quantguide.io/questions/fibonacci-sum
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: discrete math book
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 16:25:28 America/New_York
- Last Edited By: Gabe

### 题干

Evaluate $\displaystyle \sum_{k=0}^{\infty} \dfrac{F_k}{10^{k+1}}$, where $F_k$ is the $k$th Fibonacci number defined by $F_0 = 0$, $F_1 = 1$, and $F_{k} = F_{k-1} + F_{k-2}$ for $k \geq 2$. 

### Hint

Define $S$ as the sum in equation. We can expand out the first few terms of the sum as $$\displaystyle \sum_{k=0}^{\infty} \dfrac{F_k}{10^{k+1}} = \dfrac{F_0}{10} + \dfrac{F_1}{10^2} + \dfrac{F_2}{10^3} + \dfrac{F_3}{10^4} + \dots = \dfrac{F_0}{10} + \dfrac{F_1}{10^2} + \left(\dfrac{F_0}{10^3} + \dfrac{F_1}{10^3}\right) + \left(\dfrac{F_1}{10^4} + \dfrac{F_2}{10^4}\right) + \dots$$

### 解答

Define $S$ as the sum in equation. We can expand out the first few terms of the sum as $$\displaystyle \sum_{k=0}^{\infty} \dfrac{F_k}{10^{k+1}} = \dfrac{F_0}{10} + \dfrac{F_1}{10^2} + \dfrac{F_2}{10^3} + \dfrac{F_3}{10^4} + \dots = \dfrac{F_0}{10} + \dfrac{F_1}{10^2} + \left(\dfrac{F_0}{10^3} + \dfrac{F_1}{10^3}\right) + \left(\dfrac{F_1}{10^4} + \dfrac{F_2}{10^4}\right) + \dots$$

We used the definition of the Fibonacci sequence in the second equality. Now, we can regroup the terms as $$S = \dfrac{F_0}{10} + \dfrac{F_1}{100} + \left(\dfrac{F_0}{10^3} + \dfrac{F_1}{10^4} + \dots\right) + \left(\dfrac{F_1}{10^3} + \dfrac{F_2}{10^4} + \dots\right)$$ As $F_0 = 0$, we can add in a $\dfrac{F_0}{10^2}$ term to the beginning of the second parenthesized group without changing the value. Note, the first parenthesized statement is just $\dfrac{1}{10^2}S$, as all the exponents are shifted by $2$. Similarly, the second parenthesized statement is just $\dfrac{1}{10}S$. Therefore, we have that $$S = \dfrac{0}{10} + \dfrac{1}{100} + \dfrac{1}{100}S + \dfrac{1}{10}S \iff \dfrac{89}{100}S = \dfrac{1}{100} \iff S = \dfrac{1}{89}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/89"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "7akVMTxZ74jk5u6R4GBD",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 16:25:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4415739,
    "source": "discrete math book",
    "status": "published",
    "tags": [],
    "title": "Fibonacci Sum",
    "topic": "brainteasers",
    "urlEnding": "fibonacci-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "7akVMTxZ74jk5u6R4GBD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Fibonacci Sum",
    "topic": "brainteasers",
    "urlEnding": "fibonacci-sum"
  }
}
```
