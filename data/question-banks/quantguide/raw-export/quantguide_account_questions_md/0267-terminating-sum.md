# QuantGuide Question

## 267. Terminating Sum

**Metadata**

- ID: `tV35PQujQ2JZN6uGfLfs`
- URL: https://www.quantguide.io/questions/terminating-sum
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: MAO edited
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-4 18:19:49 America/New_York
- Last Edited By: Gabe

### 题干

Evaluate $\displaystyle \sum_{k \in S} \dfrac{1}{k^3}$, where $S$ is the set of all positive integers such that $\dfrac{1}{k}$ has a terminating decimal expansion. For example, $2 \in S$, as $\dfrac{1}{2} = 0.5$ has a finite expansion. However, $7 \notin S$, as $\dfrac{1}{7} = 0.\overline{142857}$ does not terminate.

### Hint

The prime factorization of $100$ is $100 = 2^2 \cdot 5^2$. Therefore, whatever denominator we have must be in the form $k = 2^a5^b$. 

### 解答

The prime factorization of $100$ is $100 = 2^2 \cdot 5^2$. Therefore, whatever denominator we have must be in the form $k = 2^a5^b$ for it to terminate in finite length. If we select a denominator that is not in this form, we end up with a decimal that will repeat forever, as it is not cleanly divisible into $10$. Therefore, our sum can really be written as $$\displaystyle \sum_{a=0}^{\infty} \sum_{b=0}^{\infty} \left(\dfrac{1}{2^a5^b}\right)^3 = \displaystyle \sum_{a=0}^{\infty} \dfrac{1}{8^a} \sum_{b=0}^{\infty} \dfrac{1}{125^b} = \dfrac{1}{1 - \frac{1}{8}} \cdot \dfrac{1}{1-\frac{1}{125}} = \dfrac{8}{7} \cdot \dfrac{125}{124} = \dfrac{250}{217}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "250/217"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "tV35PQujQ2JZN6uGfLfs",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-4 18:19:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2075001,
    "source": "MAO edited",
    "status": "published",
    "tags": [],
    "title": "Terminating Sum",
    "topic": "brainteasers",
    "urlEnding": "terminating-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "tV35PQujQ2JZN6uGfLfs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Terminating Sum",
    "topic": "brainteasers",
    "urlEnding": "terminating-sum"
  }
}
```
