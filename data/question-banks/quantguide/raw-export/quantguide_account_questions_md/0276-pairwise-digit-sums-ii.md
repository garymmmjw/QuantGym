# QuantGuide Question

## 276. Pairwise Digit Sums II

**Metadata**

- ID: `NPVsid2QEZn9FGt5aCXs`
- URL: https://www.quantguide.io/questions/pairwise-digit-sums-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Optiver
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 20:19:08 America/New_York
- Last Edited By: Gabe

### 题干

Let $A$ be the set of 5 digit integers such that all pairwise sums of digits are unique. For example, a three digit number with this property is $174$. Let $x$ and $y$ be the minimal and maximal elements of $A$, respectively. Find $y-x$.

### Hint

Consider working from the largest magnitude digit at the left all the way to the smallest at the right.

### 解答

We will start with the largest number. Start in the left-most position with $9$. Then, the second digit from left should be $8$. We can't have replicate digits, as otherwise, we could pair any other digit in the number with either one of the two repeated digits and get the same sum. Then, the next digit is $7$, as we still have all unique digit sums. Therefore, our number is in the form $987ab$, with $a$ and $b$ still to be determined. $a$ can't be $6$, as $6 + 9 = 7 + 8$. However, with $a = 5$, we still maintain all unique digit sums. Thus, our form is $9875b$. If $b = 4$, then $4 + 9 = 8 + 5$. If $b = 3$, then $3 + 9 = 5 + 7$. However, with $b = 2$, we get all unique digit sums. Therefore, $y = 98752$. 

$$$$

For the smallest, the smallest first digit is $1$. Then, the smallest second digit is $0$. The smallest third digit is $2$. Thus, our number is in the form $102cd$. If $c = 3$, $1 + 2 = 3 + 0$, but for $c = 4$, we still maintain unique sums. Therefore, our form is $1024d$. If $d = 5$, then $5 + 0 = 4 + 1$. If $d = 6$, then $6 + 0 = 4 + 2$. However, for $d = 7$, we maintain unique sums, so $x = 10247$. Therefore, $y - x = 88505$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "88505"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "NPVsid2QEZn9FGt5aCXs",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:19:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2128829,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Pairwise Digit Sums II",
    "topic": "brainteasers",
    "urlEnding": "pairwise-digit-sums-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "NPVsid2QEZn9FGt5aCXs",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Pairwise Digit Sums II",
    "topic": "brainteasers",
    "urlEnding": "pairwise-digit-sums-ii"
  }
}
```
