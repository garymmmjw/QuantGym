# QuantGuide Question

## 49. 4 Die Sum

**Metadata**

- ID: `z84bs4k9WEhpHjDe2m5J`
- URL: https://www.quantguide.io/questions/4-die-sum
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Old Mission
- Source: gabe
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-26 09:59:33 America/New_York
- Last Edited By: Gabe

### 题干

Calculate the probability that when we roll $4$ fair $6-$sided dice, the sum of their upfaces is 20.

### Hint

Count the different permutations that sum of $20$. Alternatively, condition on the sum of the first $2$ dice.

### 解答

Clearly there are $6^4 = 1296$ total outcomes of the 4 dice rolls. We need to divide this up into all of the permutations that sum to 20, as well as count all of their arrangements. The permutations that sum to 20 are $$6,6,6,2; 6,6,5,3; 6,6,4,4; 6,5,5,4; 5,5,5,5$$ by brute force. Note that we now need to count all of the arrangements for each combination, as we created our sample space so that it include all 4-tuples. For $6,6,6,2$, there are $4$ permutations corresponding to where the 2 is put. For $6,6,5,3$, there are $12$ permutations corresponding to just dividing $4!$ (total permutations) by $2!$ for the two sixes. By the same idea, $6,6,4,4$ has 6 permutations, $6,5,5,4$ has 12 permutations, and $5,5,5,5$ has $1$ permutation. Adding all of these up, we get $35$ possible permutations that add to $20$. Therefore, the probability is $\dfrac{35}{1296}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "35/1296"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "z84bs4k9WEhpHjDe2m5J",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-26 09:59:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 343574,
    "source": "gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "4 Die Sum",
    "topic": "probability",
    "urlEnding": "4-die-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "z84bs4k9WEhpHjDe2m5J",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "4 Die Sum",
    "topic": "probability",
    "urlEnding": "4-die-sum"
  }
}
```
