# QuantGuide Question

## 803. Sheep Stealing

**Metadata**

- ID: `8ShP943gTlVmVpbDkVnA`
- URL: https://www.quantguide.io/questions/sheep-stealing
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Puzzles_and_Curious_Problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-18 10:14:37 America/New_York
- Last Edited By: Gabe

### 题干

Some sheep stealers made a raid and carried off one-third of the flock of sheep, and one-third of a sheep. Another party stole one-fourth of what remained, and one fourth of a sheep. Then, a third party of raiders carried off one-fifth of the remainder and three-fifths of a sheep, leaving $409$ behind. What was the number of sheep in the flock? 

$$$$

$\textbf{Note:}$ The question is intentionally worded hard to understand to test your ability to parse through and interpret information.

### Hint

Write expressions for the number of sheep remaining after each raid. 

### 解答

Let $n$ be the number of sheep in the flock. Let $n_1$ and $n_2$ be the numbers remaining after the first and second raids respectively. We have

$$409 = n_2 - \left(\frac{n_2}{5} + \frac{3}{5}\right) \Rightarrow n_2 = 512$$

Then, we have

$$512 = \left(n_1 - \frac{n_1}{4}\right) + \frac{1}{4} \Rightarrow n_1 = 683$$

Finally, we have

$$683 = n - \left(\frac{n}{3} + \frac{1}{3}\right) \Rightarrow n = 1025$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1025"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8ShP943gTlVmVpbDkVnA",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-18 10:14:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6570554,
    "source": "Puzzles_and_Curious_Problems",
    "status": "published",
    "tags": [],
    "title": "Sheep Stealing",
    "topic": "brainteasers",
    "urlEnding": "sheep-stealing",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "8ShP943gTlVmVpbDkVnA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Sheep Stealing",
    "topic": "brainteasers",
    "urlEnding": "sheep-stealing"
  }
}
```
