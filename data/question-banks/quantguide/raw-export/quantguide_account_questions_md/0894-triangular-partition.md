# QuantGuide Question

## 894. Triangular Partition

**Metadata**

- ID: `7p3SCatkegVcj3Bjc0O8`
- URL: https://www.quantguide.io/questions/triangular-partition
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AOPS
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A point $P$ is chosen within triangle $\triangle ABC$. Compute the probability that the area of $\triangle ABP$, $\triangle BCP$, or $\triangle CAP$ is no more than one fourth that of $\triangle ABC$.

### Hint

Draw 3 lines parallel to each side that split each side into a $3:1$ ratio.

### 解答

We can avoid principle of inclusion-exclusion by employing a complementary approach. First, we draw an arbitrary triangle $\triangle ABC$. Consider when $AB$ is the base of the triangle. We draw a line parallel to $AB$ such that it splits the height of length $h$ into two lines of lengths $\frac{3h}{4}$ and $\frac{h}{4}$. We notice that $P$ must fall within the region between that line and $AB$ in order for our condition to be satisfied. Repeating for bases $BC$ and $CA$ and subsequently length-chasing with similar triangles, we find that there is a triangle with sides of length $\frac{1}{4}AB, \frac{1}{4}BC, \frac{1}{4}CA$ in the middle of $\triangle ABC$ where $P$ cannot fall. So, our answer is $1 - \frac{1}{16} = \frac{15}{16}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15/16"
    ],
    "difficulty": "medium",
    "id": "7p3SCatkegVcj3Bjc0O8",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7326860,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Triangular Partition",
    "topic": "probability",
    "urlEnding": "triangular-partition"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "7p3SCatkegVcj3Bjc0O8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Triangular Partition",
    "topic": "probability",
    "urlEnding": "triangular-partition"
  }
}
```
