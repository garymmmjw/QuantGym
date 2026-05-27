# QuantGuide Question

## 580. Missing Product

**Metadata**

- ID: `oZpwbuwl3h6SF2FEPVZJ`
- URL: https://www.quantguide.io/questions/missing-product
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: sig
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 22:31:54 America/New_York
- Last Edited By: Gabe

### 题干

You have $4$ positive real numbers $a,b,c,$ and $d$. When you multiply each pair of the numbers together, you get some element of the $6$ element set $\{9,10,12,27,30,x\}$. Find $x$.

### Hint

Note that since $a,b,c,$ and $d$ don't necessarily have to be integers, prime factorization matching may not solve the question entirely. One thing to quickly notice is that the integers $9$ and $10$, as well as $27$ and $30$ are in our set. Therefore, this implies two of the values, say $a$ and $b$, satisfy, $a = \dfrac{9}{10}b$.

### 解答

Note that since $a,b,c,$ and $d$ don't necessarily have to be integers, prime factorization matching may not solve the question entirely. One thing to quickly notice is that the integers $9$ and $10$, as well as $27$ and $30$ are in our set. Therefore, this implies two of the values, say $a$ and $b$, satisfy, $a = \dfrac{9}{10}b$. One may now take the guess that $a = 9$ and $b = 10$. However, this doesn't work, as one of the other integers would have to be $c = 1$, and there would be too many missing values remaining. The next natural guess would be $a=  \dfrac{9}{2}$ and $b = 5$, as you can obtain the values $9$ and $10$ from setting another integer $c = 2$. Running with this, we see that $ac = 9$ and $bc = 10$. To find $d$, the values left that we haven't matched yet are $12, 27,$ and $30$. However, we see that $12 = 2 \cdot 6, 27 = \dfrac{9}{2} \cdot 6,$ and $30 = 5 \cdot 6$, which implies $d = 6$. The last value should be $ab = \dfrac{9}{2} \cdot 5 = \dfrac{45}{2}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "45/2"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "oZpwbuwl3h6SF2FEPVZJ",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 22:31:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4659472,
    "source": "sig",
    "status": "published",
    "tags": [],
    "title": "Missing Product",
    "topic": "brainteasers",
    "urlEnding": "missing-product",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "oZpwbuwl3h6SF2FEPVZJ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Missing Product",
    "topic": "brainteasers",
    "urlEnding": "missing-product"
  }
}
```
