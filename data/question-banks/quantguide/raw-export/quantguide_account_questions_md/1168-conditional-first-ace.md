# QuantGuide Question

## 1168. Conditional First Ace

**Metadata**

- ID: `JVmfWyBRw9Fjzz98NX9s`
- URL: https://www.quantguide.io/questions/conditional-first-ace
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: tqd
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose we deal out cards from a standard deck. Find expected number of cards after the first $2$ and before the first ace given that the first $2$ appears before the first ace.

### Hint

Use the "first ace" method twice: Once on the number of cards between consecutive $A$ and $2$s, as well as on the number of $2$s before the first ace.

### 解答

We want to find the expected cards after the first $2$ that we obtain the first ace. Therefore, our first task is to figure out how many cards that aren't ranked $A$ and $2$ show up between cards ranked $A$ or $2$ on average. We have $8$ dividers, which are precisely all of the rank $A$ and $2$ cards. These dividers split our deck up into $9$ regions. There are $44$ cards left that are not ranked $A$ or $2$, so as we have that the regions have equal size in expectation, the expected length of each region is $\dfrac{44}{9}$. Now, we need to find the expected number of regions that appear between the first $2$ and ace.

$$$$

We now do first ace again on the dividers. We know that one of the $2$s showed up already, so we only have 7 dividers left. We want to find the expected number of $2$s before the first ace, so the aces are our dividers now. The $4$ aces divide up our subset into $5$ regions. We have $3$ $2$s left, so there are on average $\dfrac{3}{5}$ $2$s per region. However, we already know that one $2$ appeared, so we must add $1$ to the number of regions that there will be. Therefore, our expected number of regions is $\dfrac{8}{5}$. However, we also need to account for the dividers, as we did not count for them previously when computing $\dfrac{44}{9}$. The average number of dividers that appear after the first $2$ is $\dfrac{3}{5}$, so we just add that in above.

$$$$

Putting this all together, the expected number of cards between them is $\dfrac{44}{9} \cdot \dfrac{8}{5} + \dfrac{3}{5} = \dfrac{379}{45}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "379/45"
    ],
    "difficulty": "hard",
    "id": "JVmfWyBRw9Fjzz98NX9s",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9700545,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Conditional First Ace",
    "topic": "probability",
    "urlEnding": "conditional-first-ace"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "JVmfWyBRw9Fjzz98NX9s",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Conditional First Ace",
    "topic": "probability",
    "urlEnding": "conditional-first-ace"
  }
}
```
