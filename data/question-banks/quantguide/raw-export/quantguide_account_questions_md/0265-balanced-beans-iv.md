# QuantGuide Question

## 265. Balanced Beans IV

**Metadata**

- ID: `eY8gKQSu69Puu7UhkJA6`
- URL: https://www.quantguide.io/questions/balanced-beans-iv
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: Kaushik - HOTS
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:29:37 America/New_York
- Last Edited By: Gabe

### 题干

There are $90$ beans; one weighs slightly heavier or lighter than the others. What is the minimum number of times a balance scale must be used to guarantee the determination of the abnormal bean?

### Hint

Groups of $3^n$ are preferable throughout this problem.

### 解答

For this problem, we will first start off with the method used to solve this specific question and then show give a generalized form for any $n$ beans.
$$$$
As with any other "Balanced Beans" problem, we need to split the $90$ beans into three groups of $30$. The worst case scenario is that the balance is not balanced. Here is where it gets difficult: How do we go about checking the remaining $60$ beans? A popular method is to subdivide each group of beans into groups of powers of $3$. 

$$$$

With $30$ beans in each group, we can divide them each up into a group of $27$ beans and a group of $3$ beans. Then, just like in "Balanced Beans II", we rotate the groups of $27$ beans around. The original groups were {{$27_A$, $3_A$}, {$27_B$, $3_B$}, {$27_C$, $3_C$}}. After the rotation, we have {{$27_C$, $3_A$}, {$27_A$, $3_B$}, {$27_B$, $3_C$}}. If the orientation of the balance doesn't change, then we know that the abnormal bean is a part of either $3_A$ or $3_B$. If the orientation did change, depending on how they changed, we can deduce which group of $27$ has the abnormal bean. The worse case is that the bean is a part of the $27$ group which from "Balanced Beans III", would take an extra 3 weighings. This makes our total 5 weighings. 
$$$$
You may be wondering why we split the groups of $30$ into $27$ and $3$. This is because using the rotation method and having groups of $3^n$ allow us to not only identify whether the abnormal ball is heavier or lighter than the others but also be left with a group of $3^n$ which we have proved in "Balanced Beans III" to take $n$ weighings. Lets take another example. Say we starting with $120$ beans. We then split them into $3$ groups of $40$ and within the $40$, we can split them into groups of $27, 9, 3$ and $1$. No matter which group the abnormal bean is, it will take the same number of weighings as we start by rotating the largest groups and go onto the smallest. $27$ will take one more weighing than $9$ beans and thus the rotation of $9$ beans comes after the rotation of $27$. 
$$$$
The generalization of this strategy becomes $\text{ceiling}(\log_{3}(2n+3))$ where $n$ is the amount of beans we have. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "eY8gKQSu69Puu7UhkJA6",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:29:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2057528,
    "source": "Kaushik - HOTS",
    "status": "published",
    "tags": [],
    "title": "Balanced Beans IV",
    "topic": "brainteasers",
    "urlEnding": "balanced-beans-iv",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "eY8gKQSu69Puu7UhkJA6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Balanced Beans IV",
    "topic": "brainteasers",
    "urlEnding": "balanced-beans-iv"
  }
}
```
