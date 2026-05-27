# QuantGuide Question

## 755. All Attainable Values

**Metadata**

- ID: `t4h8Qeb0Ta2UNEk7yY9L`
- URL: https://www.quantguide.io/questions/all-attainable-values
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: die book
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-3 20:40:12 America/New_York
- Last Edited By: Gabe

### 题干

How many $6-$sided dice with values on each side in the set $\{1,2,3,4,5,6\}$ are there with the property that when rolled twice, for each integer $2 \leq k \leq 12$, there is positive probability that the sum is exactly $k$? Note that not every value in the set necessarily needs to be used and that two dice are considered indistinguishable if they contains the exactly same amount of faces corresponding to each value in the set, regardless of the labelling of the sides. Assume each side appears with equal probability.

### Hint

The numbers $1, 2, 5$ and $6$ must always be among the numbers on the die. If they weren't the sums of $2,3,11,$ and $12$ would be impossible. What sums are missing and how would you obtain them?

### 解答

The numbers $1, 2, 5$ and $6$ must always be among the numbers on the die. If they weren't the sums of $2,3,11,$ and $12$ would be impossible. To make sums of $5$ and $9$ possible, we must include one of $3$ or $4$ on our die. The last value can be anything afterwards. 


$$$$

Let $D_3$ and $D_4$ represent the sets of dice arrangements that have $3$ and $4$ present, respectively. We want $|D_3 \cup D_4|$, the number of dice that contain at least one of $3$ or $4$. By Inclusion-Exclusion, we have that $$|D_3 \cup D_4| = |D_3| + |D_4| - |D_3 \cap D_4|$$ $|D_3| = |D_4| = 6$, as we fix $1$ side to be $3$ (or $4$), and then the other can be anything. Then $|D_3 \cap D_4| = 1$, as this corresponds to just the standard die with all values $1-6$. Therefore, there are $6+6 - 1 = 11$ dice satisfying this property.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "t4h8Qeb0Ta2UNEk7yY9L",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-3 20:40:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6160768,
    "source": "die book",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "All Attainable Values",
    "topic": "probability",
    "urlEnding": "all-attainable-values",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "t4h8Qeb0Ta2UNEk7yY9L",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "All Attainable Values",
    "topic": "probability",
    "urlEnding": "all-attainable-values"
  }
}
```
