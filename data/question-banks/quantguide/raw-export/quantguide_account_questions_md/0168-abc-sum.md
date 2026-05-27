# QuantGuide Question

## 168. ABC Sum

**Metadata**

- ID: `TTIMLIu7n5kkaUhlYTiH`
- URL: https://www.quantguide.io/questions/abc-sum
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: PDT Partners
- Source: PDT Partners Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Find the sum of all numbers in the form $0.abcabcabc\dots$, where each of $a,b,c$ are distinct integers from $0$ to $9$.

### Hint

How many such numbers can be formed? What is the average value of each digit?

### 解答

There are $10 \cdot 9 \cdot 8 = 720$ such numbers that can be formed, as we have $10$ options for $a$, $9$ for $b$, and $8$ for $c$. Then, the trick is here that we need to note the average value of each digit is $4.5$. This means the average value of the numbers we generate is $$\dfrac{9}{2} \cdot 10^{-1} + \dfrac{9}{2} \cdot 10^{-2} + \dots = \dfrac{9}{2} \sum_{k=1}^{\infty} \dfrac{1}{10^k} = \dfrac{1}{2}$$ Therefore, the sum must be $\dfrac{1}{2} \cdot 720 = 360$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "360"
    ],
    "companies": [
      {
        "company": "PDT Partners"
      }
    ],
    "difficulty": "medium",
    "id": "TTIMLIu7n5kkaUhlYTiH",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1256952,
    "source": "PDT Partners Glassdoor",
    "status": "published",
    "tags": [],
    "title": "ABC Sum",
    "topic": "brainteasers",
    "urlEnding": "abc-sum"
  },
  "list_summary": {
    "companies": [
      {
        "company": "PDT Partners"
      }
    ],
    "difficulty": "medium",
    "id": "TTIMLIu7n5kkaUhlYTiH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "ABC Sum",
    "topic": "brainteasers",
    "urlEnding": "abc-sum"
  }
}
```
