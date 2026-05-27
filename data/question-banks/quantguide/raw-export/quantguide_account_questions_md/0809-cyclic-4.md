# QuantGuide Question

## 809. Cyclic 4

**Metadata**

- ID: `23wRX9m1EleeCDfgHxkt`
- URL: https://www.quantguide.io/questions/cyclic-4
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: WorldQuant
- Source: glassdoor
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:09:55 America/New_York
- Last Edited By: Gabe

### 题干

What is the smallest positive integer that ends with the digit $4$ such that moving its last digit to the first position (i.e. 1234 => 4123) multiplies the original integer by exactly $4$?

### Hint

Note here that the first digit of our integer must be $1$, as when multiplied by $4$, the first digit must now be $4$. Try writing out the decimal expansions, rearranging, and see what you notice about the LHS term and what it implies for the RHS.

### 解答

Clearly the integer isn't $4$, so it has at least $2$ digits. Suppose it has exactly $2$ digits. Then it is in the form $a4$ for some integer $a$. We would want $4(10a + 4) = 40 + a$, as $40 + a$ is the representation of $4a$. This would mean that $39a = 24$ which is not possible. 

$$$$

Note here that the first digit of our integer must be $1$, as when multiplied by $4$, the first digit must now be $4$. Therefore, for three digits, we can see that the form is $1a4$ for an integer $a$. We would need to have that $4(104 + a) = 410 + a$, so $3a = -6$. This is not possible, as our integer must be non-negative. 

$$$$

Next, suppose it has $4$ digits. Therefore, it is in the form $1ab4$. We would need to satisfy $4(1004 + 100a + 10b) = 4100 + 10a + b$, which would imply that $390a + 39b = 84$. This is not possible, as $39 \nmid 84$. 

$$$$

We are starting to see a pattern here. The integer on the RHS with $n$ non-fixed digits is $4 \cdot 10^n + 10^{n-1}$, whereas the integer on the LHS is $4 \cdot 10^n + 16$. Therefore, we need to find the smallest $n$ such that their difference, which is $10^{n-1} - 16$, is divisible by $39$. The terms on the LHS, before division, are all $39 \cdot 10^k$ for $0 \leq k \leq n-1$. Try equating this representation to the example above.

$$$$

For $n = 3$, this number is $984$, which is not divisible by $39$. However, for $n = 4$, the number on the RHS is $9984 = 39 \cdot 256$. Therefore, the number must be in the form $1abcd4$, as we have $4$ free digits in the middle. Then, the equation we need to satisfy in the non-negative integers is $$39000a + 3900b + 390c + 39d = 9984$$ Clearly $a = 0$, as everything must be non-negative. Dividing by $39$, we see that $100b + 10c + d = 256 = 100 \cdot 2 + 10 \cdot 5 + 6$, which clearly yields $a = 0, b=2, c = 5, d = 6$. Therefore, our answer is $102564$. We can quickly verify that $410256 = 4 \cdot 102564$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "102564"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "23wRX9m1EleeCDfgHxkt",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:09:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6616067,
    "source": "glassdoor",
    "status": "published",
    "tags": [],
    "title": "Cyclic 4",
    "topic": "brainteasers",
    "urlEnding": "cyclic-4"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "id": "23wRX9m1EleeCDfgHxkt",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Cyclic 4",
    "topic": "brainteasers",
    "urlEnding": "cyclic-4"
  }
}
```
