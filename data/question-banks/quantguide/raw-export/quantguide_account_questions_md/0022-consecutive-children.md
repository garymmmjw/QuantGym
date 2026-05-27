# QuantGuide Question

## 22. Consecutive Children

**Metadata**

- ID: `fR9MLPDXBO8BhjXTKXNW`
- URL: https://www.quantguide.io/questions/consecutive-children
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: 536
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-29 08:45:18 America/New_York
- Last Edited By: Gabe

### 题干

$$9$ children of distinct ages (in years) were born with a fixed interval of time between consecutive children. The sum of the squares of the ages of all the children is equal to the square of their father's age. Assuming that the father is aged at most $60$, what is the father's age?

### Hint

Let $m$ be the age of the middle child, $s$ be the spacing between the children's births, and $d$ be the age of the dad. Then our condition says that $(m-4s)^2 + (m-3s)^2 + \dots + m^2 + (m+s)^2  + \dots + (m+4s)^2 = d^2$. Try seeing what the dad's age must be divisible by.

### 解答

Let $m$ be the age of the middle child, $s$ be the spacing between the children's births, and $d$ be the age of the dad. Then our condition says that $(m-4s)^2 + (m-3s)^2 + \dots + m^2 + (m+s)^2  + \dots + (m+4s)^2 = d^2$. After expanding and cancelling, this reduces to $d^2 = 9m^2 + 60s^2$. Since the RHS is a multiple of $3$, we have that $3 \mid d^2$, which means $3 \mid d$. Therefore, let $d = 3r$ for an integer $r$. This means that $9r^2 = 9m^2 + 60s^2$, which equivalent is $(r-m)(r+m) = \dfrac{20}{3}s^2$. Since the LHS is an integer, this means that $3 \mid s$ as well. 

$$$$

For the youngest child to be born, we must have that $m - 4s \geq 0$, which means $m \geq 4s$. Therefore, we have that $d^2 \geq 9(4s)^2 + 60s^2 = 204s^2 \geq (14s)^2$. Therefore, $d \geq 14s$. Since $3 \mid s$ and $d \geq 60$, we must have that $s = 0, 3$. Since they are not of the same age, $s = 3$. Plugging this in, we have that $(r-m)(r+m) = 60$. We now need to find factorizations of $60$ that have an integer midpoint, as the midpoint of $r-m$ and $r+m$ is $r$. Namely, we see that $10\cdot 6$ and $30 \cdot 2$ both have integer midpoints. If we select the former, then $r = 8$ and $m = 2$, meaning that the middle child has age $2$. As $s = 3$, we would get some negative ages. Therefore, we must have that the midpoint is $r = 16$ and $m = 14$. This is now consistent, as the children would be aged $2,5,8,11,14,17,20,23,$ and $26$. Since the father's age is $3r$, we get that the father is aged $3 \cdot 16 = 48$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "48"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "fR9MLPDXBO8BhjXTKXNW",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-29 08:45:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 176165,
    "source": "536",
    "status": "published",
    "tags": [],
    "title": "Consecutive Children",
    "topic": "brainteasers",
    "urlEnding": "consecutive-children",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "fR9MLPDXBO8BhjXTKXNW",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Consecutive Children",
    "topic": "brainteasers",
    "urlEnding": "consecutive-children"
  }
}
```
